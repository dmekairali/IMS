// app/api/orders/debug/route.js
// Diagnostic endpoint: explains why a given order ID does or does not list.
// Usage: GET /api/orders/debug?id=ASK_AYURVEDA-1574
//
// Reports, for the requested order id:
//   - whether the fallback spreadsheet is configured
//   - whether it exists in DispatchData (and the exact stored string)
//   - matching line-item rows in "All Form Data" (primary)
//   - matching line-item rows in "OrderProductDetails" (fallback)
//   - the final verdict: would it list, and if not, why
import { getSheets } from '@/lib/googleSheets';
import { PRIMARY_HEADER_MAP, FALLBACK_HEADER_MAP, parseOrderItems } from '@/lib/orderItems';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Surface differences that are invisible to the eye (spaces, case, dash type).
function describeString(s) {
  if (s === undefined || s === null) return { value: s, length: 0, note: 'missing' };
  return {
    value: s,
    length: s.length,
    hasLeadingSpace: /^\s/.test(s),
    hasTrailingSpace: /\s$/.test(s),
    codePoints: [...s].map(c => c.codePointAt(0)),
  };
}

// Inspect one item sheet: do the headers resolve, and which rows match the id?
function inspectItemSheet(rows, targetId, headerMap) {
  if (!rows || rows.length === 0) {
    return { sheetEmpty: true, rowCount: 0, headersResolved: false, matches: [] };
  }
  const headers = rows[0];
  const getIdx = (name) => headers.findIndex(h => h === name);
  const cols = {
    orderId: getIdx(headerMap.orderId),
    sku: getIdx(headerMap.sku),
    qty: getIdx(headerMap.qty),
  };
  const headersResolved = cols.orderId !== -1 && cols.sku !== -1 && cols.qty !== -1;

  const matches = [];
  if (headersResolved) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowId = row[cols.orderId];
      if (rowId === undefined) continue;
      // collect exact matches AND near-misses (trim/case) to spot the mismatch
      const exact = rowId === targetId;
      const trimmedMatch = (rowId || '').trim() === targetId.trim();
      const caseMatch = (rowId || '').trim().toLowerCase() === targetId.trim().toLowerCase();
      if (exact || trimmedMatch || caseMatch) {
        const qty = parseInt(row[cols.qty] || '0');
        matches.push({
          sheetRow: i + 1,
          storedOrderId: describeString(rowId),
          exactMatch: exact,
          qty,
          qtyPassesFilter: qty > 0,
          sku: row[cols.sku] || '',
        });
      }
    }
  }

  return {
    sheetEmpty: false,
    rowCount: rows.length - 1,
    headersExpected: { orderId: headerMap.orderId, sku: headerMap.sku, qty: headerMap.qty },
    headerIndices: cols,
    headersResolved,
    matches,
  };
}

export async function GET(request) {
  const noStore = { 'Cache-Control': 'no-store' };
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('id');

  if (!targetId) {
    return Response.json({ error: 'Provide ?id=<orderId>' }, { status: 400, headers: noStore });
  }

  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERSHEET;
    const fallbackSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_FALLBACK;

    const [dispatchDataResponse, formDataResponse, fallbackResponse] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'DispatchData!A1:AE' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'All Form Data!A1:Q' }),
      fallbackSpreadsheetId
        ? sheets.spreadsheets.values
            .get({ spreadsheetId: fallbackSpreadsheetId, range: 'OrderProductDetails!A1:X' })
            .catch(err => ({ data: { values: [] }, __error: err.message }))
        : Promise.resolve({ data: { values: [], __notConfigured: true } }),
    ]);

    const dispatchRows = dispatchDataResponse.data.values || [];
    const formDataRows = formDataResponse.data.values || [];
    const fallbackRows = fallbackResponse.data.values || [];

    // --- DispatchData lookup ---
    const dHeaders = dispatchRows[0] || [];
    const orderIdCol = dHeaders.findIndex(h => h === 'Oder ID');
    const dispatchMatches = [];
    for (let i = 1; i < dispatchRows.length; i++) {
      const rowId = dispatchRows[i][orderIdCol];
      if (rowId === undefined) continue;
      if (
        rowId === targetId ||
        (rowId || '').trim() === targetId.trim() ||
        (rowId || '').trim().toLowerCase() === targetId.trim().toLowerCase()
      ) {
        dispatchMatches.push({
          sheetRow: i + 1,
          storedOrderId: describeString(rowId),
          exactMatch: rowId === targetId,
        });
      }
    }

    // --- Item sheets ---
    const primary = inspectItemSheet(formDataRows, targetId, PRIMARY_HEADER_MAP);
    const fallback = inspectItemSheet(fallbackRows, targetId, FALLBACK_HEADER_MAP);

    // --- Reproduce the real listing logic exactly ---
    const comboMap = {}; // combos only expand existing rows; empty is fine for counting
    let parsedItems = parseOrderItems(formDataRows, targetId, comboMap, PRIMARY_HEADER_MAP);
    let itemSource = 'primary';
    if (parsedItems.length === 0 && fallbackRows.length > 0) {
      parsedItems = parseOrderItems(fallbackRows, targetId, comboMap, FALLBACK_HEADER_MAP);
      if (parsedItems.length > 0) itemSource = 'fallback';
    }
    const wouldList = dispatchMatches.length > 0 && parsedItems.length > 0;

    // --- Verdict ---
    let verdict;
    if (dispatchMatches.length === 0) {
      verdict = 'NOT in DispatchData — the list is built from DispatchData, so it can never appear.';
    } else if (parsedItems.length === 0) {
      const reasons = [];
      if (fallback.sheetEmpty && fallbackResponse.__notConfigured) {
        reasons.push('GOOGLE_SHEETS_SPREADSHEET_ID_FALLBACK is NOT set — OrderProductDetails is never read.');
      } else if (fallback.sheetEmpty && fallbackResponse.__error) {
        reasons.push(`Fallback fetch failed: ${fallbackResponse.__error}`);
      }
      if (!primary.sheetEmpty && !primary.headersResolved) {
        reasons.push('"All Form Data" headers (Order Id / SKU(All) / Qty) did not resolve.');
      }
      if (!fallback.sheetEmpty && !fallback.headersResolved) {
        reasons.push('"OrderProductDetails" headers (Order Id / Product SKU / Qty) did not resolve.');
      }
      const exactItemMatches = [...primary.matches, ...fallback.matches].filter(m => m.exactMatch);
      const nearMisses = [...primary.matches, ...fallback.matches].filter(m => !m.exactMatch);
      if (exactItemMatches.length === 0 && nearMisses.length > 0) {
        reasons.push('Item rows exist but the Order Id does NOT exactly match (whitespace/case/dash diff) — see near-miss rows below.');
      }
      if (exactItemMatches.length > 0 && exactItemMatches.every(m => !m.qtyPassesFilter)) {
        reasons.push('Item rows match exactly but every Qty is ≤ 0, so all rows are filtered out.');
      }
      if (reasons.length === 0) {
        reasons.push('In DispatchData but no matching line-item rows found in either item sheet.');
      }
      verdict = `In DispatchData but dropped at the "0 items" gate. Reason(s): ${reasons.join(' ')}`;
    } else {
      verdict = `Would list. ${parsedItems.length} item(s) found via ${itemSource}.`;
    }

    return Response.json(
      {
        targetId: describeString(targetId),
        config: {
          orderSheetConfigured: !!spreadsheetId,
          fallbackConfigured: !!fallbackSpreadsheetId,
          fallbackSpreadsheetIdTail: fallbackSpreadsheetId
            ? `…${fallbackSpreadsheetId.slice(-6)}`
            : null,
          fallbackFetchError: fallbackResponse.__error || null,
        },
        dispatchData: {
          orderIdColumnResolved: orderIdCol !== -1,
          matchCount: dispatchMatches.length,
          matches: dispatchMatches,
        },
        primaryItemSheet_AllFormData: primary,
        fallbackItemSheet_OrderProductDetails: fallback,
        parsedItemCount: parsedItems.length,
        itemSource: parsedItems.length > 0 ? itemSource : null,
        wouldList,
        verdict,
      },
      { headers: noStore }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: noStore });
  }
}
