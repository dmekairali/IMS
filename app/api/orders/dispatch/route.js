// app/api/orders/dispatch/route.js - Log to IMS and OID Log
import { getSheets, clearBatchCache } from '@/lib/googleSheets';

export async function POST(request) {
  const { orderId, dispatches } = await request.json();

  if (!orderId || !dispatches || dispatches.length === 0) {
    return Response.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const sheets = await getSheets();
    
    // 1. Log transactions to IMS (which auto-updates batch Remaining via formula)
    await logToIMS(sheets, orderId, dispatches);

    // 2. Log OID to OID Log
    await logOIDDispatch(sheets, orderId);

    // 3. Clear batch cache to force refresh
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
        '', // PI Total - can be added later
        '', // BillTo/ShipTo
        ''  // Attachment
      ]]
    }
  });
}
