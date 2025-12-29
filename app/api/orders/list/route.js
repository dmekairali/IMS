// app/api/orders/list/route.js - New implementation
import { getSheets } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

    // 1. Get dispatched OIDs from OID Log
    const oidLogResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'OID Log!A2:A',
    });
    
    const dispatchedOIDs = new Set((oidLogResponse.data.values || []).map(row => row[0]));

    // 2. Get all orders from DispatchData
    const dispatchDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'DispatchData!A1:Z', // Get headers + data
    });

    const dispatchRows = dispatchDataResponse.data.values || [];
    if (dispatchRows.length === 0) {
      return Response.json({ orders: [] });
    }

    // Parse headers
    const headers = dispatchRows[0];
    const getColumnIndex = (name) => headers.findIndex(h => h === name);

    const timestampCol = getColumnIndex('Timestamp');
    const orderIdCol = getColumnIndex('Oder ID'); // Note: "Oder ID" typo in sheet
    const clientNameCol = getColumnIndex('Name of Client');
    const mobileCol = getColumnIndex('Mobile');
    const invoiceAmountCol = getColumnIndex('Invoice Amount');
    const dispatchedCol = getColumnIndex('Dispatched');
    const dispatchStatusCol = getColumnIndex('Dispatch Status');

    // 3. Get all SKU details from All Form Data
    const formDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'All Form Data!A1:Z',
    });

    const formDataRows = formDataResponse.data.values || [];
    if (formDataRows.length === 0) {
      return Response.json({ orders: [] });
    }

    const formHeaders = formDataRows[0];
    const getFormColumnIndex = (name) => formHeaders.findIndex(h => h === name);

    const formOrderIdCol = getFormColumnIndex('Order Id');
    const productsCol = getFormColumnIndex('Products');
    const mrpCol = getFormColumnIndex('MRP');
    const packageCol = getFormColumnIndex('Package');
    const qtyCol = getFormColumnIndex('Qty');
    const totalCol = getFormColumnIndex('Total');
    const skuCol = getFormColumnIndex('SKU(All)');

    // 4. Build orders
    const orders = [];

    for (let i = 1; i < dispatchRows.length; i++) {
      const row = dispatchRows[i];
      const orderId = row[orderIdCol];
      const dispatched = row[dispatchedCol];

      // Skip if already dispatched or in OID Log
      if (dispatched === 'Yes' || dispatchedOIDs.has(orderId)) {
        continue;
      }

      // Get SKU items for this order
      const orderItems = formDataRows
        .slice(1)
        .filter(formRow => formRow[formOrderIdCol] === orderId)
        .map(formRow => ({
          productName: formRow[productsCol] || '',
          sku: formRow[skuCol] || '',
          mrp: parseFloat(formRow[mrpCol] || '0'),
          package: formRow[packageCol] || '',
          quantityOrdered: parseInt(formRow[qtyCol] || '0'),
          total: parseFloat(formRow[totalCol] || '0')
        }));

      if (orderItems.length === 0) continue; // Skip orders without items

      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);

      orders.push({
        orderId: orderId,
        orderDate: row[timestampCol] || new Date().toISOString(),
        customerName: row[clientNameCol] || 'Unknown',
        mobile: row[mobileCol] || '',
        invoiceAmount: parseFloat(row[invoiceAmountCol] || '0'),
        status: row[dispatchStatusCol] || 'Pending',
        items: orderItems,
        totalQuantity: totalQuantity,
        rowIndex: i + 1 // For updating later
      });
    }

    return Response.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
