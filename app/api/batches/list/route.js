// app/api/batches/list/route.js
import { getSheets } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Batches!A2:Z',
    });

    const rows = response.data.values || [];
    
    const batches = rows.map(row => ({
      productName: row[0],
      batchNo: row[1],
      mfgDate: row[2],
      expiryDate: row[3],
      availableQty: parseInt(row[4] || '0'),
      originalQty: parseInt(row[5] || '0'),
      location: row[6] || '',
      status: row[7] || 'Active'
    }));

    return Response.json({ batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
