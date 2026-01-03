// app/api/batches/list/route.js - UPDATED VERSION - Replace your existing file
import { getSheets, getBatchCache, setBatchCache } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    console.log('📥 Batches list API called');
    
    // Check cache first
    const cached = getBatchCache();
    if (cached) {
      console.log('✅ Returning cached batches');
      return Response.json({ batches: cached, fromCache: true });
    }

    console.log('🔄 Cache miss - fetching fresh data from Google Sheets...');
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Batches!A2:Z',
    });

    const rows = response.data.values || [];
    console.log(`📊 Retrieved ${rows.length} batch rows from Google Sheets`);
    
    // Columns: Batch Number, Batch Description, Description Name, Size, SKU, IN, OUT, Remaining, BatchDate, ExpiryDate
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

    console.log(`✅ Returning ${batches.length} FRESH batches from Google Sheets`);
    return Response.json({ batches, fromCache: false });
  } catch (error) {
    console.error('❌ Error fetching batches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
