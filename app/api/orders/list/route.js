// app/api/orders/list/route.js - UPDATED VERSION
// Include packing status and consignment image URL
import { getSheets } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

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
      range: 'DispatchData!A1:Z',
    });

    const dispatchRows = dispatchDataResponse.data.values || [];
    if (dispatchRows.length === 0) {
      return Response.json({ orders: [] }, { headers });
    }

    // Parse headers
    const headers_data = dispatchRows[0];
    const getColumnIndex = (name) => headers_data.findIndex(h => h === name);

    const timestampCol = getColumnIndex('Timestamp');
    const orderIdCol = getColumnIndex('Oder ID');
    const clientNameCol = getColumnIndex('Name of Client');
    const mobileCol = getColumnIndex('Mobile');
    const invoiceAmountCol = getColumnIndex('Invoice Amount');
    const invoiceNoCol = getColumnIndex('Invoice No');
    const dispatchedCol = getColumnIndex('Dispatched');
    const dispatchStatusCol = getColumnIndex('Dispatch Status');
    const billingAddressCol = getColumnIndex('Billing Address');
    const shippingAddressCol = getColumnIndex('Shipping Address');
    const packingListCol = getColumnIndex('Packing List');
    const stickerCol = getColumnIndex('Sticker');
    const consignmentImageCol = getColumnIndex('Consignment Images Url'); // ⭐ NEW

    // 3. Get all SKU details from All Form Data
    const formDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'All Form Data!A1:Z',
    });

    const formDataRows = formDataResponse.data.values || [];
    if (formDataRows.length === 0) {
      return Response.json({ orders: [] }, { headers });
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

      // Get SKU items for this order
      const orderItems = formDataRows
        .slice(1)
        .filter(formRow => {
          const qty = parseInt(formRow[qtyCol] || '0');
          return formRow[formOrderIdCol] === orderId && qty > 0;
        })
        .map(formRow => ({
          productName: formRow[productsCol] || '',
          sku: formRow[skuCol] || '',
          mrp: parseFloat(formRow[mrpCol] || '0'),
          package: formRow[packageCol] || '',
          quantityOrdered: parseInt(formRow[qtyCol] || '0'),
          total: parseFloat(formRow[totalCol] || '0')
        }));

      if (orderItems.length === 0) continue;

      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
      const packingListLink = row[packingListCol] || '';
      const stickerLink = row[stickerCol] || '';
      const consignmentImageUrl = consignmentImageCol !== -1 ? (row[consignmentImageCol] || '') : ''; // ⭐ NEW
      const hasPacking = packingListLink !== '' && packingListLink !== undefined;
      const hasConsignmentImage = consignmentImageUrl !== '' && consignmentImageUrl !== undefined; // ⭐ NEW

      orders.push({
        orderId: orderId,
        orderDate: row[timestampCol] || new Date().toISOString(),
        customerName: row[clientNameCol] || 'Unknown',
        mobile: row[mobileCol] || '',
        invoiceAmount: parseFloat(row[invoiceAmountCol] || '0'),
        invoiceNo: row[invoiceNoCol] || '',
        status: row[dispatchStatusCol] || 'Pending',
        dispatched: dispatched === 'Yes',
        dispatchedInOIDLog: dispatchedOIDs.has(orderId),
        billingAddress: row[billingAddressCol] || '',
        shippingAddress: row[shippingAddressCol] || '',
        packingListLink: packingListLink,
        stickerLink: stickerLink,
        consignmentImageUrl: consignmentImageUrl, // ⭐ NEW
        hasPacking: hasPacking,
        hasConsignmentImage: hasConsignmentImage, // ⭐ NEW
        items: orderItems,
        totalQuantity: totalQuantity,
        rowIndex: i + 1
      });
    }

    console.log(`✅ Fetched ${orders.length} orders at ${new Date().toISOString()}`);

    return Response.json({ orders }, { headers });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
}
