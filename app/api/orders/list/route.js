// app/api/orders/list/route.js - UPDATED VERSION (No OID Log, with Combo Expansion)
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

    // Get all orders from DispatchData (no OID Log check needed)
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
    const invoiceLinkCol = getColumnIndex('Invoice Link');
    const consignmentImageCol = getColumnIndex('Consignment Images Url');

    // Get all SKU details from All Form Data
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

    // Get combo mappings
    const comboResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Combo!A1:Z',
    });

    const comboMap = buildComboMap(comboResponse.data.values || []);

    // Build orders
    const orders = [];

    for (let i = 1; i < dispatchRows.length; i++) {
      const row = dispatchRows[i];
      const orderId = row[orderIdCol];
      const dispatched = row[dispatchedCol];

      // Get SKU items for this order
      const orderItems = [];
      
      formDataRows.slice(1).forEach(formRow => {
        const formOrderId = formRow[formOrderIdCol];
        const qty = parseInt(formRow[qtyCol] || '0');
        const sku = formRow[skuCol] || '';
        
        if (formOrderId !== orderId || qty <= 0) return;

        // Check if this is a combo product
        if (sku.startsWith('KP-Combo')) {
          // Expand combo into individual products
          const comboProducts = comboMap[sku] || [];
          comboProducts.forEach(comboProduct => {
            orderItems.push({
              productName: comboProduct.productName,
              sku: comboProduct.sku,
              mrp: comboProduct.mrp,
              package: comboProduct.package,
              quantityOrdered: comboProduct.quantity * qty, // Multiply by combo quantity
              total: comboProduct.mrp * comboProduct.quantity * qty,
              isFromCombo: true,
              comboSKU: sku,
              comboName: formRow[productsCol] || ''
            });
          });
        } else {
          // Regular product
          orderItems.push({
            productName: formRow[productsCol] || '',
            sku: sku,
            mrp: parseFloat(formRow[mrpCol] || '0'),
            package: formRow[packageCol] || '',
            quantityOrdered: qty,
            total: parseFloat(formRow[totalCol] || '0'),
            isFromCombo: false
          });
        }
      });

      if (orderItems.length === 0) continue;

      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
      const packingListLink = row[packingListCol] || '';
      const stickerLink = row[stickerCol] || '';
      const invoiceLink = invoiceLinkCol !== -1 ? (row[invoiceLinkCol] || '') : '';
      const consignmentImageUrl = consignmentImageCol !== -1 ? (row[consignmentImageCol] || '') : '';
      const hasPacking = packingListLink !== '' && packingListLink !== undefined;
      const hasConsignmentImage = consignmentImageUrl !== '' && consignmentImageUrl !== undefined;

      orders.push({
        orderId: orderId,
        orderDate: row[timestampCol] || new Date().toISOString(),
        customerName: row[clientNameCol] || 'Unknown',
        mobile: row[mobileCol] || '',
        invoiceAmount: parseFloat(row[invoiceAmountCol] || '0'),
        invoiceNo: row[invoiceNoCol] || '',
        status: row[dispatchStatusCol] || 'Pending',
        dispatched: dispatched === 'Yes',
        billingAddress: row[billingAddressCol] || '',
        shippingAddress: row[shippingAddressCol] || '',
        packingListLink: packingListLink,
        stickerLink: stickerLink,
        invoiceLink: invoiceLink,
        consignmentImageUrl: consignmentImageUrl,
        hasPacking: hasPacking,
        hasConsignmentImage: hasConsignmentImage,
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

function buildComboMap(comboRows) {
  if (comboRows.length === 0) return {};

  const headers = comboRows[0];
  const getColumnIndex = (name) => headers.findIndex(h => h === name);

  const comboSKUCol = getColumnIndex('Combo SKU');
  const skuCol = getColumnIndex('SKU');
  const productsInComboCol = getColumnIndex('Products in Combo');
  const productPriceCol = getColumnIndex('Product Price');
  const unitInComboCol = getColumnIndex('Unit in Combo');
  const packagingCol = getColumnIndex('Packaging');

  const comboMap = {};

  for (let i = 1; i < comboRows.length; i++) {
    const row = comboRows[i];
    const comboSKU = row[comboSKUCol];
    const sku = row[skuCol];
    
    if (!comboSKU || !sku) continue;

    if (!comboMap[comboSKU]) {
      comboMap[comboSKU] = [];
    }

    comboMap[comboSKU].push({
      sku: sku,
      productName: row[productsInComboCol] || '',
      mrp: parseFloat(row[productPriceCol] || '0'),
      quantity: parseInt(row[unitInComboCol] || '1'),
      package: row[packagingCol] || ''
    });
  }

  return comboMap;
}
