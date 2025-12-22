// pages/api/batches/list.js
import { getSheets } from '@/lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    res.status(200).json({ batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: error.message });
  }
}
