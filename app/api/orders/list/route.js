
// app/api/orders/list/route.js
import { getSheets } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A2:Z',
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
      rowIndex: index + 2
    }));

    const pendingOrders = orders.filter(
      order => order.status !== 'Completed' && order.dispatchStatus !== '100%'
    );

    return Response.json({ orders: pendingOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
