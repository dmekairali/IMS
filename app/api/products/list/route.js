import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Fetch data from "All Form Data" sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'All Form Data!A2:Z', // Adjust range based on your sheet structure
    });

    const rows = response.data.values || [];
    
    // Map rows to product objects
    // Adjust column indices based on your actual sheet structure
    const products = rows.map((row) => ({
      oid: row[0] || '',           // Column A: OID
      sku: row[1] || '',            // Column B: SKU
      productName: row[2] || '',    // Column C: Product Name
      package: row[3] || '',        // Column D: Package/UOM
      quantity: row[4] || '0',      // Column E: Quantity
      // Add more fields as needed based on your sheet structure
    }));

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
