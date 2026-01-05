// app/api/orders/dispatch/route.js - Updated with IN/OUT(TEST) logging
import { getSheets, clearBatchCache } from '@/lib/googleSheets';
import { uploadAttachmentToDrive } from '@/lib/googleDrive';
import { formatDateTime, formatDate } from '@/lib/dateFormatter';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const orderIdRaw = formData.get('orderId');
    const dispatchesRaw = formData.get('dispatches');
    const dispatchFrom = formData.get('dispatchFrom');
    const attachmentFile = formData.get('attachment'); // For non-factory dispatches
    
    const orderId = orderIdRaw;
    const dispatches = JSON.parse(dispatchesRaw);

    console.log('📦 Dispatch Request:', {
      orderId,
      dispatchFrom,
      dispatchCount: dispatches?.length,
      hasAttachment: !!attachmentFile
    });

    if (!orderId || !dispatches || dispatches.length === 0 || !dispatchFrom) {
      return Response.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const sheets = await getSheets();
    let attachmentLink = '';

    // Handle attachment upload for non-factory dispatches
    if (dispatchFrom !== 'Factory' && attachmentFile) {
      console.log('📎 Uploading attachment for stockist dispatch...');
      const bytes = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileName = `${orderId}_Attachment_${Date.now()}.${attachmentFile.name.split('.').pop()}`;
      const result = await uploadAttachmentToDrive(buffer, fileName, orderId);
      attachmentLink = result.webViewLink;
      console.log('✅ Attachment uploaded:', attachmentLink);
    }

    // 1. Log to IN/OUT(TEST) sheet (ONLY for Factory dispatches)
    if (dispatchFrom === 'Factory') {
      await logToInOutTest(sheets, orderId, dispatches, dispatchFrom);
      console.log('✅ IN/OUT(TEST) logged for Factory dispatch');
    } else {
      console.log('⏭️ Skipping IN/OUT(TEST) logging for Stockist dispatch');
    }

    // 2. Update DispatchData sheet
    await updateDispatchData(sheets, orderId, dispatches, dispatchFrom, attachmentLink);

    // 3. Clear batch cache to force refresh (only for factory dispatches)
    if (dispatchFrom === 'Factory') {
      clearBatchCache();
    }

    return Response.json({ 
      success: true, 
      message: 'Dispatched successfully',
      dispatches 
    });
  } catch (error) {
    console.error('❌ Dispatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function logToInOutTest(sheets, orderId, dispatches, dispatchFrom) {
  const spreadsheetId = '1Yxf9Hie-teHeJxIP8ucHoqU966ViSC7SCzxZhw0dn-E';
  
  // Format: DD/MM/YYYY HH:MM:SS and DD/MM/YYYY
  const currentDateTime = formatDateTime();
  const date = formatDate();

  // Get order details from DispatchData
  const orderSheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
  const orderResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: orderSheetId,
    range: 'DispatchData!A1:Z',
  });

  const orderRows = orderResponse.data.values || [];
  const orderHeaders = orderRows[0];
  const orderIdCol = orderHeaders.findIndex(h => h === 'Oder ID');
  const clientNameCol = orderHeaders.findIndex(h => h === 'Name of Client');
  const invoiceNoCol = orderHeaders.findIndex(h => h === 'Invoice No');

  let clientName = '';
  let invoiceNo = '';

  for (let i = 1; i < orderRows.length; i++) {
    if (orderRows[i][orderIdCol] === orderId) {
      clientName = orderRows[i][clientNameCol] || '';
      invoiceNo = orderRows[i][invoiceNoCol] || orderId;
      break;
    }
  }

  // IN/OUT(TEST) columns:
  // TimeStamp | IN/OUT | Date | FG/RM/PM | Description | Sku | Qty | Transaction Type | 
  // Invoice N./ Batch N. | PO Number | Cost | Cost (without tax) | RefrenceID | Client Name | UID | Invoice | Remarks
  
  const rows = dispatches.map(dispatch => [
    currentDateTime,           // TimeStamp (DD/MM/YYYY HH:MM:SS)
    'OUT',                     // IN/OUT
    date,                      // Date (DD/MM/YYYY)
    'FG',                      // FG/RM/PM
    dispatch.productName || '', // Description
    dispatch.sku,              // Sku
    dispatch.qty,              // Qty
    'New Order FMS',           // Transaction Type
    dispatch.batchNo || '',    // Invoice N./ Batch N. (Batch Number for Factory, empty for Stockist)
    '',                        // PO Number
    '',                        // Cost
    '',                        // Cost (without tax)
    orderId,                   // RefrenceID
    clientName,                // Client Name
    '',                        // UID
    invoiceNo,                 // Invoice
    dispatchFrom !== 'Factory' ? `Dispatched from ${dispatchFrom}` : '' // Remarks
  ]);

  console.log(`📝 Logging ${rows.length} entries to IN/OUT(TEST)`);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'IN/OUT(TEST)!A:Q',
    valueInputOption: 'RAW',
    resource: {
      values: rows
    }
  });

  console.log('✅ IN/OUT(TEST) logging completed');
}

async function updateDispatchData(sheets, orderId, dispatches, dispatchFrom, attachmentLink) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
  
  // Format: DD/MM/YYYY HH:MM:SS
  const currentDateTime = formatDateTime();

  // 1. Find the row with this Order ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'DispatchData!A1:Z',
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return;

  const headers = rows[0];
  const orderIdCol = headers.findIndex(h => h === 'Oder ID');
  const dispatchedCol = headers.findIndex(h => h === 'Dispatched');
  const dispatchedDateCol = headers.findIndex(h => h === 'Dispatched Date');
  const piTotalCol = headers.findIndex(h => h === 'PI Total');
  const billToShipToCol = headers.findIndex(h => h === 'BillTo/ShipTo');
  const attachmentCol = headers.findIndex(h => h === 'Attachment');

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

  // Calculate total quantity
  const totalQty = dispatches.reduce((sum, d) => sum + d.qty, 0);

  // Determine BillTo/ShipTo value
  const billToShipToValue = dispatchFrom === 'Factory' 
    ? 'Kairali Ayurvedic Products Pvt Ltd' 
    : dispatchFrom;

  // 2. Update columns
  const updates = [];

  // Dispatched = Yes
  if (dispatchedCol !== -1) {
    updates.push({
      range: `DispatchData!${indexToColumn(dispatchedCol)}${rowIndex}`,
      values: [['Yes']]
    });
  }

  // Dispatched Date (DD/MM/YYYY HH:MM:SS)
  if (dispatchedDateCol !== -1) {
    updates.push({
      range: `DispatchData!${indexToColumn(dispatchedDateCol)}${rowIndex}`,
      values: [[currentDateTime]]
    });
  }

  // PI Total
  if (piTotalCol !== -1) {
    updates.push({
      range: `DispatchData!${indexToColumn(piTotalCol)}${rowIndex}`,
      values: [[totalQty]]
    });
  }

  // BillTo/ShipTo
  if (billToShipToCol !== -1) {
    updates.push({
      range: `DispatchData!${indexToColumn(billToShipToCol)}${rowIndex}`,
      values: [[billToShipToValue]]
    });
  }

  // Attachment (only for non-factory dispatches)
  if (attachmentCol !== -1 && dispatchFrom !== 'Factory' && attachmentLink) {
    updates.push({
      range: `DispatchData!${indexToColumn(attachmentCol)}${rowIndex}`,
      values: [[attachmentLink]]
    });
  }

  // Batch update all fields
  for (const update of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: update.range,
      valueInputOption: 'RAW',
      resource: {
        values: update.values
      }
    });
  }

  console.log('✅ DispatchData updated successfully');
}

function indexToColumn(index) {
  let column = '';
  while (index >= 0) {
    column = String.fromCharCode((index % 26) + 65) + column;
    index = Math.floor(index / 26) - 1;
  }
  return column;
}
