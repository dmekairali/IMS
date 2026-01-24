// components/reports/ExecutiveDashboard.jsx - Executive Summary Dashboard
'use client';
import { useMemo } from 'react';

export default function ExecutiveDashboard({ products, metadata }) {
  // Calculate key metrics
  const metrics = useMemo(() => {
    const stockoutNext7 = products.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 7);
    const slowMoving = products.filter(p => p.movementClass === 'SLOW_MOVING');
    const fastMoving = products.filter(p => p.movementClass === 'FAST_MOVING');
    
    // Top 10 products by various criteria
    const topByValue = [...products]
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 10);
    
    const topFastMoving = [...fastMoving]
      .sort((a, b) => b.avgDailyConsumption - a.avgDailyConsumption)
      .slice(0, 10);
    
    const topSlowMoving = [...slowMoving]
      .sort((a, b) => a.avgDailyConsumption - b.avgDailyConsumption)
      .slice(0, 10);

    // Category-wise breakdown
    const categoryBreakdown = products.reduce((acc, p) => {
      const cat = p.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { count: 0, value: 0, stock: 0 };
      }
      acc[cat].count++;
      acc[cat].value += p.stockValue;
      acc[cat].stock += p.currentStock;
      return acc;
    }, {});

    return {
      stockoutNext7,
      slowMoving,
      fastMoving,
      topByValue,
      topFastMoving,
      topSlowMoving,
      categoryBreakdown
    };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertCard
          title="Stock-out Alert (Next 7 Days)"
          count={metrics.stockoutNext7.length}
          color="red"
          icon="⚠️"
          items={metrics.stockoutNext7.slice(0, 5)}
          renderItem={(p) => (
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate">{p.description}</span>
              <span className="text-red-700 font-bold">{p.daysRemaining}d</span>
            </div>
          )}
        />

        <AlertCard
          title="Slow-Moving Inventory"
          count={metrics.slowMoving.length}
          color="yellow"
          icon="🐌"
          items={metrics.topSlowMoving.slice(0, 5)}
          renderItem={(p) => (
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate">{p.description}</span>
              <span className="text-gray-600">₹{(p.stockValue / 1000).toFixed(0)}k</span>
            </div>
          )}
        />

        <AlertCard
          title="Fast-Moving Products"
          count={metrics.fastMoving.length}
          color="green"
          icon="🚀"
          items={metrics.topFastMoving.slice(0, 5)}
          renderItem={(p) => (
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate">{p.description}</span>
              <span className="text-green-700 font-bold">{p.avgDailyConsumption.toFixed(0)}/d</span>
            </div>
          )}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Inventory Value"
          value={`₹${(metadata.totalStockValue / 100000).toFixed(2)}L`}
          icon="💰"
          color="blue"
        />
        <SummaryCard
          label="Products Out of Stock"
          value={metadata.outOfStock}
          icon="❌"
          color="red"
        />
        <SummaryCard
          label="Overstocked Items"
          value={metadata.overstocked}
          icon="📦"
          color="orange"
        />
        <SummaryCard
          label="Healthy Stock"
          value={metadata.healthy}
          icon="✅"
          color="green"
        />
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📊</span>
          Category-wise Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(metrics.categoryBreakdown)
            .sort((a, b) => b[1].value - a[1].value)
            .map(([category, data]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-800 mb-2">{category}</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Products:</span>
                    <span className="font-medium text-gray-800">{data.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Value:</span>
                    <span className="font-medium text-green-700">₹{(data.value / 100000).toFixed(2)}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock:</span>
                    <span className="font-medium text-gray-800">{data.stock.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Top Products by Value */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>💎</span>
          Top 10 Products by Inventory Value
        </h3>
        <div className="space-y-2">
          {metrics.topByValue.map((product, index) => (
            <div key={product.sku} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{product.description}</p>
                <div className="flex gap-3 text-xs text-gray-600 mt-1">
                  <span>SKU: {product.sku}</span>
                  <span>Stock: {product.currentStock}</span>
                  <span className={`font-medium ${getStockStatusColor(product.stockStatus)}`}>
                    {product.stockStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-700">₹{(product.stockValue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-500">{product.currentStock} units</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ title, count, color, icon, items, renderItem }) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold mb-3">{count}</p>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx}>{renderItem(item)}</div>
          ))
        ) : (
          <p className="text-xs opacity-75">No items</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-xs font-medium text-gray-700">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function getStockStatusColor(status) {
  const colors = {
    'OUT_OF_STOCK': 'text-red-700',
    'CRITICAL': 'text-red-600',
    'LOW': 'text-yellow-600',
    'HEALTHY': 'text-green-600',
    'OVERSTOCKED': 'text-orange-600'
  };
  return colors[status] || 'text-gray-600';
}
