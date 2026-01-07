// app/api/batches/available/route.js - SKU-based
import { getSheets, getBatchCache } from '@/lib/googleSheets';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');

  if (!sku) {
    return Response.json({ error: 'SKU required' }, { status: 400 });
  }

  try {
    // Use cached data
    const cached = getBatchCache();
    let batches;

    if (cached) {
      batches = cached;
    } else {
      // Fetch if not cached
      const sheets = await getSheets();
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Batches!A2:J',
      });

      const rows = response.data.values || [];
      batches = rows.map(row => ({
        batchNo: row[0],
        batchDescription: row[1],
        descriptionName: row[2],
        size: row[3],
        sku: row[4],
        inQty: parseInt(row[5] || '0'),
        outQty: parseInt(row[6] || '0'),
        remaining: parseInt(row[7] || '0'),
        batchDate: row[8],
        expiryDate: row[9] || '',
      }));
    }
    
    // Filter by SKU and only available stock
    const availableBatches = batches
      .filter(batch => batch.sku === sku && batch.remaining > 0)
      .sort((a, b) => new Date(a.expiryDate || a.batchDate) - new Date(b.expiryDate || b.batchDate)); // FEFO

    return Response.json({ batches: availableBatches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
