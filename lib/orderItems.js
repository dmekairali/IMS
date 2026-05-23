// lib/orderItems.js
// Header-map-driven parser for order line items.
// Used by /api/orders/list to read items from either the primary
// "All Form Data" tab or the fallback "OrderProductDetails" tab.

export const PRIMARY_HEADER_MAP = {
  orderId: 'Order Id',
  products: 'Products',
  mrp: 'MRP',
  package: 'Package',
  qty: 'Qty',
  total: 'Total',
  sku: 'SKU(All)',
};

export const FALLBACK_HEADER_MAP = {
  orderId: 'Order Id',
  products: 'Product Name',
  mrp: 'MRP',
  package: 'Package',
  qty: 'Qty',
  total: 'Total',
  sku: 'Product SKU',
};

export function parseOrderItems(rows, orderId, comboMap, headerMap) {
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  const getIdx = (name) => headers.findIndex(h => h === name);

  const cols = {
    orderId: getIdx(headerMap.orderId),
    products: getIdx(headerMap.products),
    mrp: getIdx(headerMap.mrp),
    package: getIdx(headerMap.package),
    qty: getIdx(headerMap.qty),
    total: getIdx(headerMap.total),
    sku: getIdx(headerMap.sku),
  };

  if (cols.orderId === -1 || cols.sku === -1 || cols.qty === -1) return [];

  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowOrderId = row[cols.orderId];
    const qty = parseInt(row[cols.qty] || '0');
    const sku = row[cols.sku] || '';

    if (rowOrderId !== orderId || qty <= 0) continue;

    if (sku.startsWith('KP-Combo')) {
      const comboProducts = comboMap[sku] || [];
      comboProducts.forEach(comboProduct => {
        items.push({
          productName: comboProduct.productName,
          sku: comboProduct.sku,
          mrp: comboProduct.mrp,
          package: comboProduct.package,
          quantityOrdered: comboProduct.quantity * qty,
          total: comboProduct.mrp * comboProduct.quantity * qty,
          isFromCombo: true,
          comboSKU: sku,
          comboName: row[cols.products] || ''
        });
      });
    } else {
      items.push({
        productName: row[cols.products] || '',
        sku: sku,
        mrp: parseFloat(row[cols.mrp] || '0'),
        package: row[cols.package] || '',
        quantityOrdered: qty,
        total: parseFloat(row[cols.total] || '0'),
        isFromCombo: false
      });
    }
  }

  return items;
}

// Parse every line-item row in a sheet, grouped by orderId.
// Returns { [orderId]: productListItem[] } where each productListItem
// matches the flat shape used by /api/products/list.
export function parseProductRowsByOrder(rows, comboMap, headerMap) {
  if (!rows || rows.length === 0) return {};

  const headers = rows[0];
  const getIdx = (name) => headers.findIndex(h => h === name);

  const cols = {
    orderId: getIdx(headerMap.orderId),
    products: getIdx(headerMap.products),
    mrp: getIdx(headerMap.mrp),
    package: getIdx(headerMap.package),
    qty: getIdx(headerMap.qty),
    total: getIdx(headerMap.total),
    sku: getIdx(headerMap.sku),
  };

  if (cols.orderId === -1 || cols.sku === -1 || cols.qty === -1) return {};

  const byOrder = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const orderId = row[cols.orderId] || '';
    const qty = parseInt(row[cols.qty] || '0');
    const sku = row[cols.sku] || '';

    if (!orderId || qty <= 0) continue;

    if (!byOrder[orderId]) byOrder[orderId] = [];

    if (sku.startsWith('KP-Combo')) {
      const comboProducts = comboMap[sku] || [];
      comboProducts.forEach(comboProduct => {
        byOrder[orderId].push({
          oid: orderId,
          sku: comboProduct.sku,
          productName: comboProduct.productName,
          package: comboProduct.package,
          quantity: (comboProduct.quantity * qty).toString(),
          mrp: comboProduct.mrp.toString(),
          total: (comboProduct.mrp * comboProduct.quantity * qty).toString(),
          isFromCombo: true,
          comboSKU: sku,
          comboName: row[cols.products] || ''
        });
      });
    } else {
      byOrder[orderId].push({
        oid: orderId,
        sku: sku,
        productName: row[cols.products] || '',
        package: row[cols.package] || '',
        quantity: row[cols.qty] || '0',
        mrp: row[cols.mrp] || '0',
        total: row[cols.total] || '0',
        isFromCombo: false
      });
    }
  }

  return byOrder;
}
