// pages/api/orders/dispatch.js
import { getSheets } from '@/lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, productName, dispatches } = req.body;

  if (!orderId || !dispatches || dispatches.length === 0) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const sheets = await getSheets();
    
    // 1. Validate and deduct stock from batches
    for (const dispatch of dispatches) {
      await deductBatchStock(sheets, dispatch.batchNo, dispatch.qty);
    }

    // 2. Log transaction in IMS sheet
    await logTransaction(sheets, orderId, productName, dispatches);

    // 3. Update order status
    await updateOrderStatus(sheets, orderId, dispatches);

    res.status(200).json({ 
      success: true, 
      message: 'Dispatched successfully',
      dispatches 
    });
  } catch (error) {
    console.error('Dispatch error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function deductBatchStock(sheets, batchNo, qtyToDeduct) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;
  
  // Read all batches
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Batches!A2:Z',
  });

  const rows = response.data.values || [];
  let batchRowIndex = -1;
  let currentQty = 0;

  // Find the batch
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === batchNo) { // Column B = Batch No
      batchRowIndex = i + 2; // +2 because sheet is 1-indexed and we start from row 2
      currentQty = parseInt(rows[i][4] || '0'); // Column E = Available Qty
      break;
    }
  }

  if (batchRowIndex === -1) {
    throw new Error(`Batch ${batchNo} not found`);
  }

  if (currentQty < qtyToDeduct) {
    throw new Error(`Insufficient stock in batch ${batchNo}. Available: ${currentQty}, Requested: ${qtyToDeduct}`);
  }

  // Update the quantity
  const newQty = currentQty - qtyToDeduct;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Batches!E${batchRowIndex}`, // Column E = Available Qty
    valueInputOption: 'RAW',
    resource: {
      values: [[newQty]]
    }
  });

  // Verify the update (optimistic locking check)
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
    `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Transaction ID
    orderId,
    productName,
    dispatch.batchNo,
    dispatch.qty,
    timestamp,
    'System', // User - you can get from auth
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
  
  // Read order
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

  // Parse items and update dispatched quantities
  const items = JSON.parse(orderData[4] || '[]');
  const totalDispatched = dispatches.reduce((sum, d) => sum + d.qty, 0);
  const currentlyDispatched = parseInt(orderData[7] || '0');
  const newTotalDispatched = currentlyDispatched + totalDispatched;
  const totalOrdered = parseInt(orderData[5] || '0');
  
  // Calculate dispatch percentage
  const dispatchPercentage = Math.round((newTotalDispatched / totalOrdered) * 100);
  const newStatus = dispatchPercentage === 100 ? 'Completed' : 'Partial';

  // Update order row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Orders!D${orderRowIndex}:H${orderRowIndex}`, // Status, DispatchStatus, PartiallyDispatched
    valueInputOption: 'RAW',
    resource: {
      values: [[
        newStatus,
        orderData[4], // Items JSON (unchanged)
        totalOrdered,
        `${dispatchPercentage}%`,
        newTotalDispatched
      ]]
    }
  });
}
