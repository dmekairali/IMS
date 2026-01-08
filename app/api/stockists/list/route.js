// app/api/stockists/list/route.js - Fetch active stockist parties for dropdown
import { getSheets } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const sheets = await getSheets();
    
    // Stockist parties sheet
    const spreadsheetId = '1FTNZ-xvbrvoh_E36xjAzInxXuMm3cRGB06Mks7AQ3lk';
    const range = 'Sheet1!Y:Z';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return Response.json({ stockists: [] }, { headers });
    }

    // First row is headers: Y = Delivery Party Name, Z = BillTOShip Active
    const stockists = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const deliveryPartyName = row[0]; // Column Y
      const billToShipActive = row[1]; // Column Z
      
      // Only include if status is "Active"
      if (billToShipActive === 'Active' && deliveryPartyName) {
        stockists.push({
          name: deliveryPartyName.trim(),
          status: billToShipActive
        });
      }
    }

    console.log(`✅ Fetched ${stockists.length} active stockists at ${new Date().toISOString()}`);

    return Response.json({ 
      success: true,
      stockists 
    }, { headers });

  } catch (error) {
    console.error('Error fetching stockists:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500, headers });
  }
}
