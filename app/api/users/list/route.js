// app/api/users/list/route.js - Fetch users from UserAccess sheet
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
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_IMS; // Your IMS spreadsheet
    
    // Fetch from UserAccess sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UserAccess!A1:Z', // Get all data with headers
    });

    const rows = response.data.values || [];
    
    if (rows.length < 2) {
      return Response.json({ users: [] }, { headers });
    }

    // First row is headers
    const headerRow = rows[0];
    const getColIndex = (name) => headerRow.findIndex(h => h === name);
    
    // Column indices based on the screenshot
    const colIndices = {
      employeeId: getColIndex('employee ID'),
      name: getColIndex('Name'),
      email: getColIndex('Email'),
      passkey: getColIndex('Passkey'),
      role: getColIndex('Role'),
      status: getColIndex('Status'),
      // Access permissions
      dispatch: getColIndex('Dispatch'),
      packing: getColIndex('Packing'),
      consignment: getColIndex('Consignment'),
      reports: getColIndex('Reports'),
      liveStock: getColIndex('LiveStock'),
    };

    // Parse user data
    const users = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = row[colIndices.status];
      
      // Only include active users
      if (status === 'Active') {
        users.push({
          employeeId: row[colIndices.employeeId] || '',
          name: row[colIndices.name] || '',
          email: row[colIndices.email] || '',
          passkey: row[colIndices.passkey] || '',
          role: row[colIndices.role] || 'PC',
          status: status,
          // Access permissions
          permissions: {
            dispatch: row[colIndices.dispatch] || 'View',
            packing: row[colIndices.packing] || 'View',
            consignment: row[colIndices.consignment] || 'View',
            reports: row[colIndices.reports] || 'View',
            liveStock: row[colIndices.liveStock] || 'View',
          }
        });
      }
    }

    console.log(`✅ Fetched ${users.length} active users from UserAccess at ${new Date().toISOString()}`);

    return Response.json({ 
      success: true,
      users 
    }, { headers });

  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500, headers });
  }
}
