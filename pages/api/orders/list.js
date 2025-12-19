// pages/api/orders/list.js
import { getSheets } from '@/lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

    // Fetch orders
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A2:Z', // Adjust range as needed
    });

    const rows = response.data.values || [];
    
    const orders = rows.map((row, index) => ({
      orderId: row[0] || `ORD${index + 1}`,
      orderDate: row[1] || new Date().toISOString(),
      customerName: row[2] || 'Unknown',
      status: row[3] || 'Pending',
      items: JSON.parse(row[4] || '[]'),
      totalQuantity: parseInt(row[5] || '0'),
      dispatchStatus: row[6] || '0%',
      partiallyDispatched: parseInt(row[7] || '0'),
      rowIndex: index + 2 // For updating later
    }));

    // Filter only pending/partial orders
    const pendingOrders = orders.filter(
      order => order.status !== 'Completed' && order.dispatchStatus !== '100%'
    );

    res.status(200).json({ orders: pendingOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
}
