// lib/googleDrive.js - Google Drive utilities
import { google } from 'googleapis';

export async function getDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Create or get folder by OID
 * @param {string} oid - Order ID
 * @param {string} parentFolderId - Parent folder ID (1OKQroIiSU91L5Z4m4jG1cXiN52AzxDvf)
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateOrderFolder(oid, parentFolderId = '1OKQroIiSU91L5Z4m4jG1cXiN52AzxDvf') {
  const drive = await getDrive();

  // Check if folder exists
  const searchResponse = await drive.files.list({
    q: `name='${oid}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create new folder
  const folderMetadata = {
    name: oid,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload PDF to Google Drive
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} fileName - File name
 * @param {string} folderId - Parent folder ID
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export async function uploadPDFToDrive(pdfBuffer, fileName, folderId) {
  const drive = await getDrive();

  // Check if file exists
  const searchResponse = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
  });

  let fileId;

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    // Update existing file
    fileId = searchResponse.data.files[0].id;
    
    const { Readable } = await import('stream');
    const stream = Readable.from(pdfBuffer);
    
    await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
    });
  } else {
    // Create new file
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/pdf',
    };

    const { Readable } = await import('stream');
    const stream = Readable.from(pdfBuffer);

    const media = {
      mimeType: 'application/pdf',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    fileId = file.data.id;
  }

  // Make file publicly accessible (optional - adjust permissions as needed)
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Get web view link
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webViewLink',
  });

  return {
    id: fileId,
    webViewLink: file.data.webViewLink,
  };
}

/**
 * Update DispatchData sheet with PDF links
 * @param {string} orderId - Order ID
 * @param {string} packingListLink - Packing list link
 * @param {string} stickerLink - Sticker link
 */
export async function updateDispatchDataWithLinks(orderId, packingListLink, stickerLink) {
  const { getSheets } = await import('./googleSheets.js');
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

  // Find the row with this Order ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'DispatchData!A1:Z',
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return;

  const headers = rows[0];
  const orderIdCol = headers.findIndex(h => h === 'Oder ID');
  const packingListCol = headers.findIndex(h => h === 'Packing List');
  const stickerCol = headers.findIndex(h => h === 'Sticker');

  // Find row index
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][orderIdCol] === orderId) {
      rowIndex = i + 1; // Sheet is 1-indexed
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Order ${orderId} not found in DispatchData`);
  }

  // Convert column indices to letters
  const packingListColLetter = indexToColumn(packingListCol);
  const stickerColLetter = indexToColumn(stickerCol);

  // Update Packing List column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${packingListColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[packingListLink]]
    }
  });

  // Update Sticker column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${stickerColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[stickerLink]]
    }
  });
}

function indexToColumn(index) {
  let column = '';
  while (index >= 0) {
    column = String.fromCharCode((index % 26) + 65) + column;
    index = Math.floor(index / 26) - 1;
  }
  return column;
}
