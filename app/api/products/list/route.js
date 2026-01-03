// app/api/products/list/route.js - Match existing project structure
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

    // Map rows to product objects - EXCLUDE 0 quantity products
    const products = rows.slice(1)
      .filter(row => {
        const qty = parseInt(row[qtyCol] || '0');
        return qty > 0; // Only include products with quantity > 0
      })
      .map((row) => ({
        oid: row[orderIdCol] || '',
        sku: row[skuCol] || '',
        productName: row[productsCol] || '',
        package: row[packageCol] || '',
        quantity: row[qtyCol] || '0',
        mrp: row[mrpCol] || '0',
        total: row[totalCol] || '0',
      }));

    console.log(`✅ Fetched ${products.length} products at ${new Date().toISOString()}`);

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
