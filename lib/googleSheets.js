// lib/googleSheets.js - Update
import { google } from 'googleapis';

let sheetsInstance = null;
let batchCacheData = null;
let batchCacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSheets() {
  if (sheetsInstance) {
    return sheetsInstance;
  }

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
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
  });

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}

export function clearBatchCache() {
  batchCacheData = null;
  batchCacheTimestamp = null;
}

export function getBatchCache() {
  const now = Date.now();
  if (batchCacheData && batchCacheTimestamp && (now - batchCacheTimestamp) < CACHE_TTL) {
    return batchCacheData;
  }
  return null;
}

export function setBatchCache(data) {
  batchCacheData = data;
  batchCacheTimestamp = Date.now();
}

export function columnToIndex(column) {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + column.charCodeAt(i) - 64;
  }
  return index - 1;
}

export function indexToColumn(index) {
  let column = '';
  while (index >= 0) {
    column = String.fromCharCode((index % 26) + 65) + column;
    index = Math.floor(index / 26) - 1;
  }
  return column;
}
