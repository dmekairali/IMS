// app/api/orders/list/route.js - UPDATED VERSION (No OID Log, with Combo Expansion)
// Include packing status and consignment image URL
// Falls back to OrderProductDetails sheet when primary "All Form Data" has no items for an order
import { getSheets } from '@/lib/googleSheets';
import { parseOrderItems, PRIMARY_HEADER_MAP, FALLBACK_HEADER_MAP } from '@/lib/orderItems';

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
    // OrderProductDetails lives in a separate spreadsheet. Some orders (e.g. ASK_AYURVEDA-*)
    // have line items only in that sheet. Default to the known sheet ID so they still list
    // even when GOOGLE_SHEETS_SPREADSHEET_ID_FALLBACK is unset/blank in the environment.
    const fallbackSpreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID_FALLBACK ||
      '1QUcmBQbo3sP92Ypo0avERaJQ6Qrt27g_se34IhAT77o';

    // Fetch all sheets in parallel. Fallback failure must not break the route.
    const [dispatchDataResponse, formDataResponse, comboResponse, fallbackResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'DispatchData!A1:AE',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'All Form Data!A1:Q',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Combo!A1:Z',
      }),
      fallbackSpreadsheetId
        ? sheets.spreadsheets.values.get({
            spreadsheetId: fallbackSpreadsheetId,
            range: 'OrderProductDetails!A1:X',
          }).catch(err => {
            console.warn('Fallback OrderProductDetails fetch failed:', err.message);
            return { data: { values: [] } };
          })
        : Promise.resolve({ data: { values: [] } }),
    ]);

    const dispatchRows = dispatchDataResponse.data.values || [];
    if (dispatchRows.length === 0) {
      return Response.json({ orders: [] }, { headers });
    }

    // Parse DispatchData headers
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

    const formDataRows = formDataResponse.data.values || [];
    const fallbackRows = fallbackResponse.data.values || [];

    const comboMap = buildComboMap(comboResponse.data.values || []);

    // Build orders
    const orders = [];
    let fallbackUsedCount = 0;

    for (let i = 1; i < dispatchRows.length; i++) {
      const row = dispatchRows[i];
      const orderId = row[orderIdCol];

      let orderItems = parseOrderItems(formDataRows, orderId, comboMap, PRIMARY_HEADER_MAP);
      let itemSource = 'primary';

      if (orderItems.length === 0 && fallbackRows.length > 0) {
        orderItems = parseOrderItems(fallbackRows, orderId, comboMap, FALLBACK_HEADER_MAP);
        if (orderItems.length > 0) {
          itemSource = 'fallback';
          fallbackUsedCount++;
        }
      }

      if (orderItems.length === 0) continue;

      const dispatched = row[dispatchedCol];
      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
      const packingListLink = row[packingListCol] || '';
      const stickerLink = row[stickerCol] || '';
      const invoiceLink = invoiceLinkCol !== -1 ? (row[invoiceLinkCol] || '') : '';
      const consignmentImageUrl = consignmentImageCol !== -1 ? (row[consignmentImageCol] || '') : '';
      const hasPacking = packingListLink !== '' && packingListLink !== undefined;
      const hasConsignmentImage = consignmentImageUrl !== '' && consignmentImageUrl !== undefined;

      orders.push({
        orderId: orderId,
        orderDate: row[timestampCol],
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
        itemSource: itemSource,
        rowIndex: i + 1
      });
    }

    console.log(`✅ Fetched ${orders.length} orders (${fallbackUsedCount} from fallback) at ${new Date().toISOString()}`);

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
