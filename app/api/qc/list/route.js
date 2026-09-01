import { getSheets } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const normalizeCell = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
};

const normalizeHeader = (value) => {
  return normalizeCell(value).toLowerCase().replace(/\s+/g, ' ').trim();
};

const makeUniqueHeaders = (headers) => {
  const seen = new Map();
  return headers.map((rawHeader, index) => {
    const base = normalizeCell(rawHeader) || `Column ${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
};

function findFirstMatchingColumnIndex(normalizedHeaders, candidates) {
  const normalizedCandidates = candidates.map((item) => normalizeHeader(item));
  return normalizedHeaders.findIndex((header) => normalizedCandidates.includes(header));
}

function findAnyUploadUrl(headers, row, preferredIndex) {
  const normalized = headers.map(normalizeHeader);
  if (preferredIndex !== -1) {
    const directValue = normalizeCell(row[preferredIndex]);
    if (directValue) return directValue;
  }

  // Fallback: if no direct column found, use any URL-like field in the row
  for (let i = 0; i < headers.length; i++) {
    const header = normalizeHeader(headers[i]);
    if (!header.includes('upload') && !header.includes('url') && !header.includes('link')) continue;

    const value = normalizeCell(row[i]);
    if (!value) continue;
    if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  }

  return '';
}

function getTaskTitle(task, headers) {
  const candidates = [
    'task',
    'task name',
    'task id',
    'qc task',
    'order id',
    'id',
  ];
  const normalized = headers.map(normalizeHeader);
  const index = findFirstMatchingColumnIndex(normalized, candidates);
  if (index !== -1) {
    const value = normalizeCell(task[headers[index]]);
    if (value) return value;
  }
  return `Row ${task.rowIndex}`;
}

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_IMS;
    if (!spreadsheetId) {
      return Response.json(
        {
          success: false,
          error: 'IMS spreadsheet ID not configured. Please add GOOGLE_SHEETS_SPREADSHEET_ID_IMS.',
        },
        { status: 500, headers: CACHE_HEADERS }
      );
    }

    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'QC!A1:AZ',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return Response.json(
        {
          success: true,
          tasks: [],
          headers: [],
          message: 'No rows found in QC sheet.',
        },
        { headers: CACHE_HEADERS }
      );
    }

    const rawHeaders = rows[0] || [];
    const headers = makeUniqueHeaders(rawHeaders);
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const maxColumns = headers.length;
    const uploadUrlColumn = findFirstMatchingColumnIndex(normalizedHeaders, [
      'qc details upload url',
      'qc details upload link',
      'qc upload url',
      'qc upload link',
      'qc details url',
      'qc details link',
      'upload url',
      'upload link',
    ]);

    const tasks = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.every((cell) => normalizeCell(cell) === '')) {
        continue;
      }

      const task = {
        rowIndex: i + 1,
      };

      for (let c = 0; c < maxColumns; c++) {
        const key = headers[c];
        task[key] = normalizeCell(row[c] || '');
      }

      task.uploadUrl = normalizeCell(row[uploadUrlColumn] || '');
      task._derivedUploadUrl = findAnyUploadUrl(headers, row, uploadUrlColumn);

      task.title = getTaskTitle(task, headers);

      tasks.push(task);
    }

    return Response.json(
      {
        success: true,
        headers,
        tasks,
        total: tasks.length,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('QC list error:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
