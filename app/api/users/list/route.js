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
    console.log('🔍 Fetching users from UserAccess sheet...');
    
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_IMS;
    
    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID_IMS not set');
      return Response.json({ 
        success: false,
        error: 'IMS spreadsheet ID not configured. Please add GOOGLE_SHEETS_SPREADSHEET_ID_IMS to environment variables.' 
      }, { status: 500, headers });
    }
    
    console.log('📄 Using spreadsheet ID:', spreadsheetId);
    
    const sheets = await getSheets();
    console.log('📄 Using spreadsheet ID:', spreadsheetId);
    
    const sheets = await getSheets();
    
    // Fetch from UserAccess sheet
    console.log('📡 Fetching UserAccess sheet data...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'UserAccess!A1:Z', // Get all data with headers
    });

    const rows = response.data.values || [];
    console.log(`📊 Received ${rows.length} rows from UserAccess sheet`);
    
    if (rows.length < 2) {
      console.warn('⚠️ No user data found in UserAccess sheet');
      return Response.json({ 
        success: true,
        users: [],
        message: 'No users found in UserAccess sheet'
      }, { headers });
    }

    // First row is headers
    const headerRow = rows[0];
    console.log('📋 Headers found:', headerRow);
    
    const getColIndex = (name) => {
      const index = headerRow.findIndex(h => h === name);
      if (index === -1) {
        console.warn(`⚠️ Column "${name}" not found in headers`);
      }
      return index;
    };
    
    // Column indices based on the screenshot
    const colIndices = {
      employeeId: getColIndex('employee ID'),
      name: getColIndex('Name'),
      email: getColIndex('Email'),
      passkey: getColIndex('Passkey'),
      role: getColIndex('Role'),
      status: getColIndex('Status'),
      // Access permissions (table headers might be different)
      dispatch: getColIndex('Dispatch'),
      packing: getColIndex('Packing'),
      consignment: getColIndex('Consignment'),
      reports: getColIndex('Reports'),
      liveStock: getColIndex('LiveStock'),
    };

    // Check if essential columns exist
    const missingColumns = [];
    if (colIndices.employeeId === -1) missingColumns.push('employee ID');
    if (colIndices.name === -1) missingColumns.push('Name');
    if (colIndices.passkey === -1) missingColumns.push('Passkey');
    if (colIndices.status === -1) missingColumns.push('Status');
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing required columns:', missingColumns);
      return Response.json({ 
        success: false,
        error: `Missing required columns in UserAccess sheet: ${missingColumns.join(', ')}`,
        availableHeaders: headerRow
      }, { status: 400, headers });
    }

    // Parse user data
    const users = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const status = row[colIndices.status];
      
      // Only include active users
      if (status === 'Active') {
        const user = {
          employeeId: row[colIndices.employeeId] || '',
          name: row[colIndices.name] || '',
          email: row[colIndices.email] || '',
          passkey: row[colIndices.passkey] || '',
          role: row[colIndices.role] || 'PC',
          status: status,
          // Access permissions (default to 'View' if column doesn't exist)
          permissions: {
            dispatch: colIndices.dispatch !== -1 ? (row[colIndices.dispatch] || 'View') : 'View',
            packing: colIndices.packing !== -1 ? (row[colIndices.packing] || 'View') : 'View',
            consignment: colIndices.consignment !== -1 ? (row[colIndices.consignment] || 'View') : 'View',
            reports: colIndices.reports !== -1 ? (row[colIndices.reports] || 'View') : 'View',
            liveStock: colIndices.liveStock !== -1 ? (row[colIndices.liveStock] || 'View') : 'View',
          }
        };
        
        // Only add if employeeId and name exist
        if (user.employeeId && user.name) {
          users.push(user);
        }
      }
    }

    console.log(`✅ Fetched ${users.length} active users from UserAccess at ${new Date().toISOString()}`);

    return Response.json({ 
      success: true,
      users 
    }, { headers });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500, headers });
  }
}
