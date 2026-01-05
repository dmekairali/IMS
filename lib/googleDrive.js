// lib/googleDrive.js - Google Drive utilities with attachment upload
'use server';
import { google } from 'googleapis';
import { Readable } from 'stream';

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
 * @param {string} sharedDriveId - Shared Drive ID (0ALpZnsXZcrORUk9PVA)
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateOrderFolder(oid, sharedDriveId = '0ALpZnsXZcrORUk9PVA') {
  const drive = await getDrive();

  // Check if folder exists in Shared Drive
  const searchResponse = await drive.files.list({
    q: `name='${oid}' and '${sharedDriveId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: sharedDriveId,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create new folder in Shared Drive
  const folderMetadata = {
    name: oid,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [sharedDriveId],
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
    supportsAllDrives: true,
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
    supportsAllDrives: true,
  });

  let fileId;

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    // Update existing file
    fileId = searchResponse.data.files[0].id;
    
    // Create readable stream from buffer
    const stream = Readable.from(pdfBuffer);
    
    await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
      supportsAllDrives: true,
    });
  } else {
    // Create new file
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    // Create readable stream from buffer
    const stream = Readable.from(pdfBuffer);

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'application/pdf',
        body: stream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    fileId = file.data.id;
  }

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  // Get web view link
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'webViewLink',
    supportsAllDrives: true,
  });

  return {
    id: fileId,
    webViewLink: file.data.webViewLink,
  };
}

/**
 * Upload dispatch attachment (PDF/DOC/DOCX) to Google Drive
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} orderId - Order ID for folder organization
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export async function uploadAttachmentToDrive(fileBuffer, fileName, orderId) {
  const drive = await getDrive();
  const sharedDriveId = '0ALpZnsXZcrORUk9PVA';

  // Get or create order folder
  const folderId = await getOrCreateOrderFolder(orderId, sharedDriveId);

  // Determine MIME type based on file extension
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  const mimeType = mimeTypes[extension] || 'application/octet-stream';

  // Create readable stream from buffer
  const stream = Readable.from(fileBuffer);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = file.data.id;

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    id: fileId,
    webViewLink: file.data.webViewLink,
  };
}

/**
 * Update DispatchData sheet with PDF links and timestamps
 * @param {string} orderId - Order ID
 * @param {string} packingListLink - Packing list link
 * @param {string} stickerLink - Sticker link
 * @param {string} boxNumbers - Box numbers
 * @param {number} totalBoxes - Total boxes
 */
export async function updateDispatchDataWithLinks(orderId, packingListLink, stickerLink, boxNumbers, totalBoxes) {
  const { getSheets } = await import('./googleSheets.js');
  const { formatDateTime } = await import('./dateFormatter.js');
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

  // 1. Find the row with this Order ID
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
  const boxNoCol = headers.findIndex(h => h === 'Box No.');
  const noOfBoxesCol = headers.findIndex(h => h === 'No. of boxes');
  const packingListDateCol = headers.findIndex(h => h === 'Packing List Date'); // NEW

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

  // 2. Convert column indices to letters
  const packingListColLetter = indexToColumn(packingListCol);
  const stickerColLetter = indexToColumn(stickerCol);
  const boxNoColLetter = indexToColumn(boxNoCol);
  const noOfBoxesColLetter = indexToColumn(noOfBoxesCol);

  // Get current timestamp in DD/MM/YYYY HH:MM:SS format
  const currentDateTime = formatDateTime();

  // 3. Update Packing List column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${packingListColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[packingListLink]]
    }
  });

  // 4. Update Sticker column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${stickerColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[stickerLink]]
    }
  });

  // 5. Update Box No. column
  if (boxNoCol !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `DispatchData!${boxNoColLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[boxNumbers]]
      }
    });
  }

  // 6. Update No. of boxes column
  if (noOfBoxesCol !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `DispatchData!${noOfBoxesColLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[totalBoxes]]
      }
    });
  }

  // 7. Update Packing List Date column (NEW)
  if (packingListDateCol !== -1) {
    const packingListDateColLetter = indexToColumn(packingListDateCol);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `DispatchData!${packingListDateColLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[currentDateTime]]
      }
    });
    console.log(`✅ Packing List Date updated: ${currentDateTime}`);
  }
}

/**
 * Upload image to Google Drive
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} fileName - File name
 * @param {string} folderId - Parent folder ID
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export async function uploadImageToDrive(imageBuffer, fileName, folderId) {
  const drive = await getDrive();

  // Create readable stream from buffer
  const stream = Readable.from(imageBuffer);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: 'image/jpeg',
      body: stream,
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = file.data.id;

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    id: fileId,
    webViewLink: file.data.webViewLink,
  };
}

/**
 * Update DispatchData sheet with consignment image link
 * @param {string} orderId - Order ID
 * @param {string} imageLink - Consignment image link
 */
export async function updateDispatchDataWithConsignmentImage(orderId, imageLink) {
  const { getSheets } = await import('./googleSheets.js');
  const { formatDateTime } = await import('./dateFormatter.js');
  const sheets = await getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;

  // 1. Find the row with this Order ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'DispatchData!A1:Z',
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return;

  const headers = rows[0];
  const orderIdCol = headers.findIndex(h => h === 'Oder ID');
  const consignmentImageCol = headers.findIndex(h => h === 'Consignment Images Url');
  const consignmentImageDateCol = headers.findIndex(h => h === 'Consignment Image Date'); // NEW

  if (consignmentImageCol === -1) {
    throw new Error('Consignment Images Url column not found in DispatchData sheet');
  }

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

  // 2. Convert column index to letter
  const consignmentImageColLetter = indexToColumn(consignmentImageCol);

  // Get current timestamp in DD/MM/YYYY HH:MM:SS format
  const currentDateTime = formatDateTime();

  // 3. Update Consignment Images Url column
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `DispatchData!${consignmentImageColLetter}${rowIndex}`,
    valueInputOption: 'RAW',
    resource: {
      values: [[imageLink]]
    }
  });

  // 4. Update Consignment Image Date column (NEW)
  if (consignmentImageDateCol !== -1) {
    const consignmentImageDateColLetter = indexToColumn(consignmentImageDateCol);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `DispatchData!${consignmentImageDateColLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[currentDateTime]]
      }
    });
    console.log(`✅ Consignment Image Date updated: ${currentDateTime}`);
  }
}

function indexToColumn(index) {
  let column = '';
  while (index >= 0) {
    column = String.fromCharCode((index % 26) + 65) + column;
    index = Math.floor(index / 26) - 1;
  }
  return column;
}
