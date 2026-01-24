// components/reports/PredictionsAlerts.jsx - Stock-out Predictions & Reorder Alerts
'use client';
import { useMemo } from 'react';

export default function PredictionsAlerts({ products, subSection }) {
  const alerts = useMemo(() => {
    const stockoutNext7 = products.filter(p => p.daysRemaining > 0 && p.daysRemaining <= 7);
    const stockoutNext30 = products.filter(p => p.daysRemaining > 7 && p.daysRemaining <= 30);
    const reorderNeeded = products.filter(p => p.currentStock < p.reorderPoint && p.currentStock > 0);
    const slowMoving = products.filter(p => p.movementClass === 'SLOW_MOVING');
    const overstocked = products.filter(p => p.stockStatus === 'OVERSTOCKED');
    
    return { stockoutNext7, stockoutNext30, reorderNeeded, slowMoving, overstocked };
  }, [products]);

  if (subSection === 'stockout') {
    return <StockoutWarnings alerts={alerts} />;
  }
  
  if (subSection === 'reorder') {
    return <ReorderRecommendations alerts={alerts} />;
  }

  if (subSection === 'forecast') {
    return <DemandForecast products={products} />;
  }

  return <StockoutWarnings alerts={alerts} />;
}

function StockoutWarnings({ alerts }) {
  return (
    <div className="space-y-6">
      <AlertSection
        title="⚠️ Critical: Stock-out in Next 7 Days"
        items={alerts.stockoutNext7}
        color="red"
        emptyMessage="No critical stock-outs in next 7 days"
      />
      
      <AlertSection
        title="⚡ Warning: Stock-out in 8-30 Days"
        items={alerts.stockoutNext30}
        color="yellow"
        emptyMessage="No stock-outs expected in 8-30 days"
      />
      
      <AlertSection
        title="🐌 Slow-Moving Inventory (Consider Discounting)"
        items={alerts.slowMoving}
        color="orange"
        emptyMessage="No slow-moving items detected"
      />
    </div>
  );
}

function ReorderRecommendations({ alerts }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">📋 Reorder Recommendations</h3>
        <p className="text-sm text-blue-800">
          Based on average daily consumption and lead time. Order these products now to avoid stock-outs.
        </p>
      </div>

      <AlertSection
        title="🛒 Immediate Reorder Required"
        items={alerts.reorderNeeded.sort((a, b) => a.daysRemaining - b.daysRemaining)}
        color="red"
        emptyMessage="No immediate reorders needed"
        renderItem={(product) => (
          <ReorderCard product={product} />
        )}
      />
    </div>
  );
}

function DemandForecast({ products }) {
  const forecast = useMemo(() => {
    return products.map(p => {
      const next7Days = p.avgDailyConsumption * 7;
      const next30Days = p.avgDailyConsumption * 30;
      const stockAfter7 = p.currentStock - next7Days;
      const stockAfter30 = p.currentStock - next30Days;
      
      return {
        ...p,
        forecast7Days: next7Days,
        forecast30Days: next30Days,
        stockAfter7,
        stockAfter30,
        needsReorder7: stockAfter7 < p.reorderPoint,
        needsReorder30: stockAfter30 < p.reorderPoint
      };
    }).filter(p => p.avgDailyConsumption > 0);
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryBox
          title="Products Needing Reorder (7 days)"
          value={forecast.filter(f => f.needsReorder7).length}
          total={forecast.length}
          color="orange"
        />
        <SummaryBox
          title="Products Needing Reorder (30 days)"
          value={forecast.filter(f => f.needsReorder30).length}
          total={forecast.length}
          color="yellow"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold">Product</th>
              <th className="text-center p-3 font-semibold">Current</th>
              <th className="text-center p-3 font-semibold">Forecast (7d)</th>
              <th className="text-center p-3 font-semibold">Forecast (30d)</th>
              <th className="text-center p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {forecast.slice(0, 50).map(f => (
              <tr key={f.sku} className="border-b hover:bg-gray-50">
                <td className="p-3">{f.description}</td>
                <td className="p-3 text-center font-medium">{f.currentStock}</td>
                <td className={`p-3 text-center ${f.stockAfter7 < 0 ? 'text-red-600 font-bold' : ''}`}>
                  {f.stockAfter7.toFixed(0)}
                </td>
                <td className={`p-3 text-center ${f.stockAfter30 < 0 ? 'text-red-600 font-bold' : ''}`}>
                  {f.stockAfter30.toFixed(0)}
                </td>
                <td className="p-3 text-center">
                  {f.needsReorder7 ? (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      ⚠️ Urgent
                    </span>
                  ) : f.needsReorder30 ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      ⏰ Soon
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      ✅ OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertSection({ title, items, color, emptyMessage, renderItem }) {
  const colors = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-6`}>
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm opacity-75">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => renderItem ? renderItem(item) : <ProductAlertCard key={item.sku} product={item} />)}
        </div>
      )}
    </div>
  );
}

function ProductAlertCard({ product }) {
  return (
    <div className="bg-white rounded-lg p-3 flex justify-between items-center">
      <div className="flex-1">
        <p className="font-medium text-gray-800">{product.description}</p>
        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-red-700">{product.daysRemaining}d</p>
        <p className="text-xs text-gray-600">{product.currentStock} units</p>
      </div>
    </div>
  );
}

function ReorderCard({ product }) {
  const qtyToOrder = Math.max(0, product.reorderPoint - product.currentStock + (product.avgDailyConsumption * product.leadTime));
  
  return (
    <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-bold text-gray-800">{product.description}</p>
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
        </div>
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
          {product.daysRemaining}d left
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm mt-3">
        <div>
          <p className="text-gray-600 text-xs">Current Stock</p>
          <p className="font-bold text-gray-800">{product.currentStock}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Reorder Point</p>
          <p className="font-bold text-orange-600">{product.reorderPoint.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs">Order Qty</p>
          <p className="font-bold text-green-600">{qtyToOrder.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ title, value, total, color }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };
  
  return (
    <div className={`${colors[color]} rounded-lg border-2 p-4`}>
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value} <span className="text-lg text-gray-500">/ {total}</span></p>
    </div>
  );
}
