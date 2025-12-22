// app/api/batches/available/route.js
import { getSheets } from '@/lib/googleSheets';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product');

  if (!product) {
    return Response.json({ error: 'Product name required' }, { status: 400 });
  }

  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Batches!A2:Z',
    });

    const rows = response.data.values || [];
    
    const batches = rows
      .filter(row => row[0] === product && parseInt(row[4] || '0') > 0)
      .map(row => ({
        productName: row[0],
        batchNo: row[1],
        mfgDate: row[2],
        expiryDate: row[3],
        availableQty: parseInt(row[4] || '0'),
        location: row[5] || '',
        status: row[6] || 'Active'
      }))
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return Response.json({ batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
