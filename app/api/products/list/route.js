// app/api/products/list/route.js - Match existing project structure with combo expansion
// Falls back to OrderProductDetails sheet for orders missing from "All Form Data"
import { getSheets } from '@/lib/googleSheets';
import { parseProductRowsByOrder, PRIMARY_HEADER_MAP, FALLBACK_HEADER_MAP } from '@/lib/orderItems';

// Force dynamic rendering - prevent Next.js caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  // Set cache control headers
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
    const fallbackSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_FALLBACK;

    // Fetch primary, combo, and fallback sheets in parallel.
    const [response, comboResponse, fallbackResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'All Form Data!A1:Z',
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

    const rows = response.data.values || [];
    const fallbackRows = fallbackResponse.data.values || [];
    const comboMap = buildComboMap(comboResponse.data.values || []);

    if (rows.length === 0 && fallbackRows.length === 0) {
      return Response.json({ success: true, products: [], count: 0 }, { headers });
    }

    const primaryByOrder = parseProductRowsByOrder(rows, comboMap, PRIMARY_HEADER_MAP);
    const fallbackByOrder = parseProductRowsByOrder(fallbackRows, comboMap, FALLBACK_HEADER_MAP);

    const products = [];

    // Add all primary items
    Object.values(primaryByOrder).forEach(items => products.push(...items));

    // Add fallback items only for orders not present in primary
    let fallbackOrdersUsed = 0;
    Object.entries(fallbackByOrder).forEach(([orderId, items]) => {
      if (!primaryByOrder[orderId]) {
        products.push(...items);
        fallbackOrdersUsed++;
      }
    });

    console.log(`✅ Fetched ${products.length} products (combos expanded, ${fallbackOrdersUsed} orders from fallback) at ${new Date().toISOString()}`);

    return Response.json({
      success: true,
      products,
      count: products.length,
    }, { headers });

  } catch (error) {
    console.error('Error fetching products:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error.message,
      },
      { status: 500, headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      } }
    );
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
