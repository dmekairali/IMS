// app/api/orders/dispatch/route.js - Updated to update DispatchData
import { getSheets, clearBatchCache } from '@/lib/googleSheets';

export async function POST(request) {
  const { orderId, dispatches } = await request.json();

  if (!orderId || !dispatches || dispatches.length === 0) {
    return Response.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const sheets = await getSheets();
    
    // 1. Log transactions to IMS
    await logToIMS(sheets, orderId, dispatches);

    // 2. Log OID to OID Log
    await logOIDDispatch(sheets, orderId);

    // 3. Update DispatchData sheet
    await updateDispatchData(sheets, orderId);

    // 4. Clear batch cache to force refresh
    clearBatchCache();

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

async function logToIMS(sheets, orderId, dispatches) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_IMS;
  const timestamp = new Date().toISOString();
  
  // IMS columns: SKU, IN, OUT, BatchNumber, OrderID, Timestamp, Type
  const rows = dispatches.map(dispatch => [
    dispatch.sku,
    '', // IN - empty for dispatch
    dispatch.qty, // OUT
    dispatch.batchNo,
    orderId,
    timestamp,
    'Dispatch'
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'IMS!A:G',
    valueInputOption: 'RAW',
    resource: {
      values: rows
    }
  });
}

async function logOIDDispatch(sheets, orderId) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
  const timestamp = new Date().toISOString();
  
  // OID Log columns: Order_ID, Time_Stamp, PI Total, BillTo/ShipTo, Attachment
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'OID Log!A:E',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        orderId,
        timestamp,
        '', // PI Total
        '', // BillTo/ShipTo
        ''  // Attachment
      ]]
    }
  });
}

async function updateDispatchData(sheets, orderId) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
  const timestamp = new Date().toISOString();

  // 1. Find the row with this Order ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'DispatchData!A1:Z',
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return;

  const headers = rows[0];
  const orderIdCol = headers.findIndex(h => h === 'Oder ID'); // Note typo
  const dispatchedCol = headers.findIndex(h => h === 'Dispatched');
  const dispatchedDateCol = headers.findIndex(h => h === 'Dispatched Date');

  // Find row index
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][orderIdCol] === orderId) {
      rowIndex = i + 1; // Sheet is 1-indexed
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Order ${orderId} not found in DispatchData`);
  }

  // 2. Convert column indices to letters
  const dispatchedColLetter = indexToColumn(dispatchedCol);
  const dispatchedDateColLetter = indexToColumn(dispatchedDateCol);

  // 3. Update Dispatched column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${dispatchedColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [['Yes']]
    }
  });

  // 4. Update Dispatched Date column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${dispatchedDateColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[timestamp]]
    }
  });
}

function indexToColumn(index) {
  let column = '';
  while (index >= 0) {
    column = String.fromCharCode((index % 26) + 65) + column;
    index = Math.floor(index / 26) - 1;
  }
  return column;
}
