// app/api/orders/list/route.js
import { getSheets } from '@/lib/googleSheets';

export async function GET(request) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

    // Get dispatched OIDs from OID Log
    const oidLogResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'OID Log!A2:A',
    });
    
    const dispatchedOIDs = new Set((oidLogResponse.data.values || []).map(row => row[0]));

    // Get all orders
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A2:Z',
    });

    const rows = response.data.values || [];
    
    const orders = rows
      .filter(row => {
        const orderId = row[0];
        const status = row[3] || '';
        // Exclude: dispatched orders and cancelled orders
        return !dispatchedOIDs.has(orderId) && status !== 'Order Cancel';
      })
      .map((row, index) => ({
        orderId: row[0] || `ORD${index + 1}`,
        orderDate: row[1] || new Date().toISOString(),
        customerName: row[2] || 'Unknown',
        status: row[3] || 'Pending',
        items: JSON.parse(row[4] || '[]'),
        totalQuantity: parseInt(row[5] || '0'),
        rowIndex: index + 2
      }));

    return Response.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
