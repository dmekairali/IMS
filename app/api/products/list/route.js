// app/api/products/list/route.js - Match existing project structure with combo expansion
import { getSheets } from '@/lib/googleSheets';

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

    // Fetch data from "All Form Data" sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'All Form Data!A1:Z', // Get headers + data
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return Response.json({ orders: [], products: [] }, { headers });
    }

    // Parse headers
    const headers_data = rows[0];
    const getColumnIndex = (name) => headers_data.findIndex(h => h === name);

    const orderIdCol = getColumnIndex('Order Id');
    const productsCol = getColumnIndex('Products');
    const skuCol = getColumnIndex('SKU(All)');
    const mrpCol = getColumnIndex('MRP');
    const packageCol = getColumnIndex('Package');
    const qtyCol = getColumnIndex('Qty');
    const totalCol = getColumnIndex('Total');

    // Get combo mappings
    const comboResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Combo!A1:Z',
    });

    const comboMap = buildComboMap(comboResponse.data.values || []);

    // Map rows to product objects - EXCLUDE 0 quantity products, EXPAND combos
    const products = [];
    
    rows.slice(1).forEach((row) => {
      const qty = parseInt(row[qtyCol] || '0');
      if (qty <= 0) return; // Skip zero quantity

      const sku = row[skuCol] || '';
      const orderId = row[orderIdCol] || '';

      // Check if this is a combo product
      if (sku.startsWith('KP-Combo')) {
        // Expand combo into individual products
        const comboProducts = comboMap[sku] || [];
        comboProducts.forEach(comboProduct => {
          products.push({
            oid: orderId,
            sku: comboProduct.sku,
            productName: comboProduct.productName,
            package: comboProduct.package,
            quantity: (comboProduct.quantity * qty).toString(),
            mrp: comboProduct.mrp.toString(),
            total: (comboProduct.mrp * comboProduct.quantity * qty).toString(),
            isFromCombo: true,
            comboSKU: sku,
            comboName: row[productsCol] || ''
          });
        });
      } else {
        // Regular product
        products.push({
          oid: orderId,
          sku: sku,
          productName: row[productsCol] || '',
          package: row[packageCol] || '',
          quantity: row[qtyCol] || '0',
          mrp: row[mrpCol] || '0',
          total: row[totalCol] || '0',
          isFromCombo: false
        });
      }
    });

    console.log(`✅ Fetched ${products.length} products (combos expanded) at ${new Date().toISOString()}`);

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
