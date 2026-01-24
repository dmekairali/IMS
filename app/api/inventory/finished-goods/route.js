// app/api/inventory/finished-goods/route.js - Fetch and process Finished Goods data
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
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID_BATCHES;

    // Fetch Finished Goods sheet (header row = 2)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Finshed Goods!A1:CZ', // Wide range to capture all columns
    });

    const rows = response.data.values || [];
    
    if (rows.length < 2) {
      return Response.json({ products: [], metadata: {} }, { headers });
    }

    // Row 2 contains headers
    const headerRow = rows[1];
    
    // Map column indices
    const getColIndex = (name) => headerRow.findIndex(h => h === name);
    
    // Static columns
    const colIndices = {
      sno: getColIndex('S. No'),
      sku: getColIndex('SKU Code'),
      status: getColIndex('As per Factory Item status'),
      brand: getColIndex('Brand'),
      category: getColIndex('Category'),
      subCategory: getColIndex('Sub Category'),
      description: getColIndex('Description'),
      size: getColIndex('Size'),
      unit: getColIndex('Unit'),
      mrp: getColIndex('MRP'),
      season: getColIndex('SEASON'),
      avgDailyConsumption: getColIndex('Avg Daily Consumption'), // Column 15 (Month)
      leadTime: getColIndex('Lead Time'),
      maxLevel: getColIndex('MAX Level'),
      safetyFactor: getColIndex('Safety Factor'),
      orderRcvd: getColIndex('Order Rcvd'),
      oos: getColIndex('OOS'),
      qtyWIP: getColIndex('Qty (WIP)'),
      reservedQty: getColIndex('Reserved Quantity'),
      overallStock: getColIndex('Overall Stock'),
      stockValue: getColIndex('StockValue'),
      avgConsumption: getColIndex('Avg'),
      varianceCheck: getColIndex('% (+-) Check'),
      highest: getColIndex('Highest'),
      lowest: getColIndex('Lowest'),
      avgPlus15: getColIndex('+ avg*15%'),
      avgMinus15: getColIndex('- avg*15%'),
    };

    // Dynamically detect date columns (format: "24-Jan", "1-Jan", etc.)
    const dateColumns = [];
    headerRow.forEach((header, index) => {
      // Match formats: "1-Jan", "31-Dec", "24-Jan"
      if (/^\d{1,2}-[A-Z][a-z]{2}$/.test(header)) {
        dateColumns.push({ header, index, date: parseDateHeader(header) });
      }
    });

    // Sort date columns chronologically
    dateColumns.sort((a, b) => a.date - b.date);

    // Find TODAY column (most recent date column)
    const todayColumn = dateColumns.length > 0 ? dateColumns[dateColumns.length - 1] : null;

    // Detect monthly sales columns (e.g., "Sold (Month-Jan/26)")
    const monthlySalesColumns = [];
    headerRow.forEach((header, index) => {
      if (/^Sold \(Month-[A-Z][a-z]{2}\/\d{2}\)$/.test(header)) {
        monthlySalesColumns.push({ header, index });
      }
    });

    // Detect quarterly sales columns (e.g., "Q4-2025")
    const quarterlySalesColumns = [];
    headerRow.forEach((header, index) => {
      if (/^Q[1-4]-\d{4}$/.test(header)) {
        quarterlySalesColumns.push({ header, index });
      }
    });

    // Process products (starting from row 3, since row 1 is empty and row 2 is header)
    const products = [];
    
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row[colIndices.sku]) continue;

      const sku = row[colIndices.sku];
      const currentStock = todayColumn ? parseFloat(row[todayColumn.index] || '0') : 0;
      const avgDailyConsumption = parseFloat(row[colIndices.avgDailyConsumption] || '0');
      const leadTime = parseFloat(row[colIndices.leadTime] || '0');
      const reservedQty = parseFloat(row[colIndices.reservedQty] || '0');
      const qtyWIP = parseFloat(row[colIndices.qtyWIP] || '0');
      const overallStock = parseFloat(row[colIndices.overallStock] || '0');
      const maxLevel = parseFloat(row[colIndices.maxLevel] || '0');
      const safetyFactor = parseFloat(row[colIndices.safetyFactor] || '1');
      const mrp = parseFloat(row[colIndices.mrp] || '0');
      const stockValue = parseFloat(row[colIndices.stockValue] || '0');

      // Calculate metrics
      const availableStock = overallStock - reservedQty;
      const safetyStock = avgDailyConsumption * safetyFactor;
      const reorderPoint = (avgDailyConsumption * leadTime) + safetyStock;
      const daysRemaining = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999;
      const stockoutDate = avgDailyConsumption > 0 
        ? new Date(Date.now() + (daysRemaining * 24 * 60 * 60 * 1000))
        : null;

      // Determine stock status
      let stockStatus = 'HEALTHY';
      if (currentStock === 0) stockStatus = 'OUT_OF_STOCK';
      else if (currentStock < reorderPoint) stockStatus = 'CRITICAL';
      else if (currentStock < reorderPoint * 1.5) stockStatus = 'LOW';
      else if (currentStock > maxLevel) stockStatus = 'OVERSTOCKED';

      // Get daily stock history (last 30 days)
      const dailyStockHistory = dateColumns
        .slice(-30)
        .map(col => ({
          date: col.header,
          stock: parseFloat(row[col.index] || '0')
        }));

      // Calculate daily consumption from stock changes
      const dailyConsumption = [];
      for (let j = 1; j < dailyStockHistory.length; j++) {
        const consumption = dailyStockHistory[j - 1].stock - dailyStockHistory[j].stock;
        dailyConsumption.push({
          date: dailyStockHistory[j].date,
          consumption: consumption > 0 ? consumption : 0
        });
      }

      // Get monthly sales data
      const monthlySales = monthlySalesColumns.map(col => ({
        month: col.header,
        sales: parseFloat(row[col.index] || '0')
      }));

      // Get quarterly sales data
      const quarterlySales = quarterlySalesColumns.map(col => ({
        quarter: col.header,
        sales: parseFloat(row[col.index] || '0')
      }));

      // Movement classification
      const avgPlus15 = parseFloat(row[colIndices.avgPlus15] || '0');
      const avgMinus15 = parseFloat(row[colIndices.avgMinus15] || '0');
      let movementClass = 'NORMAL';
      if (dailyConsumption.length > 0) {
        const recentConsumption = dailyConsumption.slice(-7).reduce((sum, d) => sum + d.consumption, 0) / 7;
        if (recentConsumption < avgMinus15) movementClass = 'SLOW_MOVING';
        else if (recentConsumption > avgPlus15) movementClass = 'FAST_MOVING';
      }

      products.push({
        sku,
        description: row[colIndices.description] || '',
        brand: row[colIndices.brand] || '',
        category: row[colIndices.category] || '',
        subCategory: row[colIndices.subCategory] || '',
        size: row[colIndices.size] || '',
        unit: row[colIndices.unit] || '',
        mrp,
        season: row[colIndices.season] || '',
        status: row[colIndices.status] || '',
        
        // Stock data
        currentStock,
        overallStock,
        availableStock,
        reservedQty,
        qtyWIP,
        maxLevel,
        stockValue,
        
        // Consumption data
        avgDailyConsumption,
        leadTime,
        safetyFactor,
        safetyStock,
        reorderPoint,
        
        // Calculated metrics
        daysRemaining: Math.round(daysRemaining),
        stockoutDate: stockoutDate ? stockoutDate.toISOString() : null,
        stockStatus,
        movementClass,
        
        // Historical data
        dailyStockHistory,
        dailyConsumption,
        monthlySales,
        quarterlySales,
        
        // Analytics
        avgConsumption: parseFloat(row[colIndices.avgConsumption] || '0'),
        varianceCheck: row[colIndices.varianceCheck] || '',
        highest: parseFloat(row[colIndices.highest] || '0'),
        lowest: parseFloat(row[colIndices.lowest] || '0'),
      });
    }

    // Calculate summary statistics
    const metadata = {
      totalProducts: products.length,
      totalStockValue: products.reduce((sum, p) => sum + p.stockValue, 0),
      outOfStock: products.filter(p => p.stockStatus === 'OUT_OF_STOCK').length,
      critical: products.filter(p => p.stockStatus === 'CRITICAL').length,
      low: products.filter(p => p.stockStatus === 'LOW').length,
      healthy: products.filter(p => p.stockStatus === 'HEALTHY').length,
      overstocked: products.filter(p => p.stockStatus === 'OVERSTOCKED').length,
      slowMoving: products.filter(p => p.movementClass === 'SLOW_MOVING').length,
      fastMoving: products.filter(p => p.movementClass === 'FAST_MOVING').length,
      stockoutNext7Days: products.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 7).length,
      stockoutNext30Days: products.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 30).length,
      todayDate: todayColumn ? todayColumn.header : 'N/A',
      dateColumnsCount: dateColumns.length,
    };

    console.log(`✅ Fetched ${products.length} products from Finished Goods at ${new Date().toISOString()}`);
    console.log(`📊 Today's stock column: ${metadata.todayDate}`);

    return Response.json({ 
      success: true,
      products,
      metadata
    }, { headers });

  } catch (error) {
    console.error('Error fetching finished goods:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500, headers });
  }
}

// Helper function to parse date headers like "24-Jan" to Date object
function parseDateHeader(header) {
  const currentYear = new Date().getFullYear();
  const [day, month] = header.split('-');
  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  return new Date(currentYear, monthMap[month], parseInt(day));
}
