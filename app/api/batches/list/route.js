// app/api/batches/list/route.js - SKU-based
import { getSheets, getBatchCache, setBatchCache, clearBatchCache } from '@/lib/googleSheets';

// Force dynamic rendering - prevent Next.js caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  // Check for force refresh parameter
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  // Set cache control headers
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    // If force refresh, clear cache first
    if (forceRefresh) {
      clearBatchCache();
      console.log('🔄 Force refresh: cache cleared');
    }

    // Check cache first (unless force refresh)
    const cached = !forceRefresh ? getBatchCache() : null;
    if (cached) {
      console.log('📦 Serving batches from cache');
      return Response.json({ batches: cached, fromCache: true }, { headers });
    }

    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

    console.log('🔍 Fetching fresh batches from Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Batches!A2:Z',
    });

    const rows = response.data.values || [];
    
    // Columns: Batch Number, Batch Description, Description Name, Size, SKU, IN, OUT, Remaining, BatchDate
    const batches = rows.map(row => ({
      batchNo: row[0],
      batchDescription: row[1],
      descriptionName: row[2],
      size: row[3],
      sku: row[4],
      inQty: parseInt(row[5] || '0'),
      outQty: parseInt(row[6] || '0'),
      remaining: parseInt(row[7] || '0'),
      batchDate: row[8],
      expiryDate: row[9] || '', // If you have expiry
    }));

    // Cache the data
    setBatchCache(batches);
    console.log(`✅ Fetched and cached ${batches.length} batches at ${new Date().toISOString()}`);

    return Response.json({ batches, fromCache: false }, { headers });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
}
