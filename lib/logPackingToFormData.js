// lib/logPackingToFormData.js
import { getSheets } from './googleSheets';

/**
 * Logs packing slip generation to "Form Data" sheet
 * Sheet ID: 1duhyMVdELvygvl1gips4bJ_oH6HqszcBmhEhzBD5sqI
 * 
 * Columns:
 * TimeStamp | Invoice No | Order Id | Box No. | No. of boxes | Packing List | Packing Stickers | Client Name
 * 
 * @param {Object} params
 * @param {string} params.orderId - Order ID (e.g., "OID_33123")
 * @param {string} params.invoiceNo - Invoice number (e.g., "S/1572")
 * @param {string} params.customerName - Client name
 * @param {number} params.totalBoxes - Total number of boxes
 * @param {string} params.packingListLink - Google Drive link to packing list PDF
 * @param {string} params.stickerLink - Google Drive link to stickers PDF
 */
export async function logPackingToFormData({
  orderId,
  invoiceNo,
  customerName,
  totalBoxes,
  packingListLink,
  stickerLink
}) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = '1duhyMVdELvygvl1gips4bJ_oH6HqszcBmhEhzBD5sqI';
    const sheetName = 'Form Data';

    // Generate timestamp in format: MM/DD/YYYY HH:MM:SS
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Generate Box No. string (e.g., "1,2,3" for 3 boxes)
    const boxNumbers = Array.from({ length: totalBoxes }, (_, i) => i + 1).join(',');

    // Prepare row data matching the column order
    const rowData = [
      timestamp,              // TimeStamp
      invoiceNo,              // Invoice No
      orderId,                // Order Id
      boxNumbers,             // Box No. (e.g., "1,2,3")
      totalBoxes,             // No. of boxes (e.g., 3)
      packingListLink,        // Packing List (Drive link)
      stickerLink,            // Packing Stickers (Drive link)
      customerName            // Client Name
    ];

    // Append row to Form Data sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:H`, // Columns A through H
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData]
      }
    });

    console.log('✅ Packing log appended to Form Data sheet');
    return true;

  } catch (error) {
    console.error('❌ Error logging to Form Data sheet:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}
