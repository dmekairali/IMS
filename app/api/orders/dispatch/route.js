// app/api/orders/dispatch/route.js
import { getSheets } from '@/lib/googleSheets';

export async function POST(request) {
  const { orderId, productName, dispatches } = await request.json();

  if (!orderId || !dispatches || dispatches.length === 0) {
    return Response.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const sheets = await getSheets();
    
    for (const dispatch of dispatches) {
      await deductBatchStock(sheets, dispatch.batchNo, dispatch.qty);
    }

    await logTransaction(sheets, orderId, productName, dispatches);
    await updateOrderStatus(sheets, orderId, dispatches);

    return Response.json({ 
      success: true, 
      message: 'Dispatched successfully',
      dispatches 
    });
  } catch (error) {
    console.error('Dispatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function deductBatchStock(sheets, batchNo, qtyToDeduct) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Batches!A2:Z',
  });

  const rows = response.data.values || [];
  let batchRowIndex = -1;
  let currentQty = 0;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === batchNo) {
      batchRowIndex = i + 2;
      currentQty = parseInt(rows[i][4] || '0');
      break;
    }
  }

  if (batchRowIndex === -1) {
    throw new Error(`Batch ${batchNo} not found`);
  }

  if (currentQty < qtyToDeduct) {
    throw new Error(`Insufficient stock in batch ${batchNo}. Available: ${currentQty}, Requested: ${qtyToDeduct}`);
  }

  const newQty = currentQty - qtyToDeduct;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Batches!E${batchRowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[newQty]]
    }
  });

  const verifyResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Batches!E${batchRowIndex}`,
  });

  const verifiedQty = parseInt(verifyResponse.data.values[0][0]);
  
  if (verifiedQty !== newQty) {
    throw new Error('Concurrent modification detected. Please retry.');
  }

  return true;
}

async function logTransaction(sheets, orderId, productName, dispatches) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_IMS;
  const timestamp = new Date().toISOString();
  
  const rows = dispatches.map(dispatch => [
    `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    productName,
    dispatch.batchNo,
    dispatch.qty,
    timestamp,
    'System',
    'Success'
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Transactions!A:H',
    valueInputOption: 'RAW',
    resource: {
      values: rows
    }
  });
}

async function updateOrderStatus(sheets, orderId, dispatches) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Orders!A2:Z',
  });

  const rows = response.data.values || [];
  let orderRowIndex = -1;
  let orderData = null;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === orderId) {
      orderRowIndex = i + 2;
      orderData = rows[i];
      break;
    }
  }

  if (orderRowIndex === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const totalDispatched = dispatches.reduce((sum, d) => sum + d.qty, 0);
  const currentlyDispatched = parseInt(orderData[7] || '0');
  const newTotalDispatched = currentlyDispatched + totalDispatched;
  const totalOrdered = parseInt(orderData[5] || '0');
  
  const dispatchPercentage = Math.round((newTotalDispatched / totalOrdered) * 100);
  const newStatus = dispatchPercentage === 100 ? 'Completed' : 'Partial';

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Orders!D${orderRowIndex}:H${orderRowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[
        newStatus,
        orderData[4],
        totalOrdered,
        `${dispatchPercentage}%`,
        newTotalDispatched
      ]]
    }
  });
}
