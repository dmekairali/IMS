// pages/api/batches/available.js
import { getSheets } from '@/lib/googleSheets';

export async function GET(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.query;

  if (!product) {
    return res.status(400).json({ error: 'Product name required' });
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
      .filter(row => row[0] === product && parseInt(row[4] || '0') > 0) // Filter by product and available qty > 0
      .map(row => ({
        productName: row[0],
        batchNo: row[1],
        mfgDate: row[2],
        expiryDate: row[3],
        availableQty: parseInt(row[4] || '0'),
        location: row[5] || '',
        status: row[6] || 'Active'
      }))
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)); // FEFO sort

    res.status(200).json({ batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: error.message });
  }
}
