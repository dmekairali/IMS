// app/api/combos/list/route.js - Fetch combo products mapping
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

    // Fetch combo data
    const comboResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Combo!A1:Z',
    });

    const rows = comboResponse.data.values || [];
    if (rows.length === 0) {
      return Response.json({ combos: {} }, { headers });
    }

    // Parse headers
    const headers_data = rows[0];
    const getColumnIndex = (name) => headers_data.findIndex(h => h === name);

    const comboSKUCol = getColumnIndex('Combo SKU');
    const skuCol = getColumnIndex('SKU');
    const productsInComboCol = getColumnIndex('Products in Combo');
    const productPriceCol = getColumnIndex('Product Price');
    const unitInComboCol = getColumnIndex('Unit in Combo');
    const packagingCol = getColumnIndex('Packaging');

    // Build combo mapping: { "KP-Combo-001": [ {product1}, {product2} ] }
    const comboMap = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
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

    console.log(`✅ Fetched ${Object.keys(comboMap).length} combos at ${new Date().toISOString()}`);

    return Response.json({ combos: comboMap }, { headers });
  } catch (error) {
    console.error('Error fetching combos:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
}
