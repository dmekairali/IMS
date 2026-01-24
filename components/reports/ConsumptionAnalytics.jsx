// components/reports/ConsumptionAnalytics.jsx - Consumption Trends & Patterns
'use client';
import { useMemo } from 'react';

export default function ConsumptionAnalytics({ products, subSection }) {
  const analytics = useMemo(() => {
    // Calculate consumption statistics
    const totalConsumption = products.reduce((sum, p) => sum + (p.avgDailyConsumption || 0), 0);
    const avgConsumption = totalConsumption / products.length;
    
    // Group by category
    const byCategory = products.reduce((acc, p) => {
      const cat = p.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { count: 0, consumption: 0, products: [] };
      }
      acc[cat].count++;
      acc[cat].consumption += p.avgDailyConsumption || 0;
      acc[cat].products.push(p);
      return acc;
    }, {});

    // Top consumers
    const topConsumers = [...products]
      .filter(p => (p.avgDailyConsumption || 0) > 0)
      .sort((a, b) => (b.avgDailyConsumption || 0) - (a.avgDailyConsumption || 0))
      .slice(0, 10);

    // Calculate monthly consumption from daily
    const monthlyProjection = products.map(p => ({
      ...p,
      monthlyConsumption: (p.avgDailyConsumption || 0) * 30,
      quarterlyConsumption: (p.avgDailyConsumption || 0) * 90,
      yearlyConsumption: (p.avgDailyConsumption || 0) * 365
    }));

    return {
      totalConsumption,
      avgConsumption,
      byCategory,
      topConsumers,
      monthlyProjection
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📈 Consumption Analytics</h2>
        <p className="text-gray-600">Daily, monthly & quarterly consumption patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Daily Consumption"
          value={analytics.totalConsumption.toFixed(0)}
          subtitle="Total units/day"
          color="blue"
          icon="📊"
        />
        <MetricCard
          title="Monthly Projection"
          value={(analytics.totalConsumption * 30).toFixed(0)}
          subtitle="Estimated units/month"
          color="green"
          icon="📅"
        />
        <MetricCard
          title="Avg per Product"
          value={analytics.avgConsumption.toFixed(1)}
          subtitle="Units/day/product"
          color="purple"
          icon="📦"
        />
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📂 Consumption by Category</h3>
        <div className="space-y-3">
          {Object.entries(analytics.byCategory)
            .sort(([, a], [, b]) => b.consumption - a.consumption)
            .map(([category, data]) => (
              <CategoryBar
                key={category}
                category={category}
                consumption={data.consumption}
                productCount={data.count}
                maxConsumption={Math.max(...Object.values(analytics.byCategory).map(c => c.consumption))}
              />
            ))}
        </div>
      </div>

      {/* Top 10 Consumers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔥 Top 10 High Consumption Products</h3>
        <div className="space-y-2">
          {analytics.topConsumers.map((product, index) => (
            <div key={product.sku} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                index < 3 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{product.description}</p>
                <p className="text-xs text-gray-500">{product.category}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-700">{product.avgDailyConsumption.toFixed(0)}</p>
                <p className="text-xs text-gray-500">units/day</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consumption Projections Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">📊 Consumption Projections</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Product</th>
                <th className="text-center p-3 font-semibold text-gray-700">Daily</th>
                <th className="text-center p-3 font-semibold text-gray-700">Monthly (30d)</th>
                <th className="text-center p-3 font-semibold text-gray-700">Quarterly (90d)</th>
                <th className="text-center p-3 font-semibold text-gray-700">Yearly (365d)</th>
                <th className="text-center p-3 font-semibold text-gray-700">Current Stock</th>
              </tr>
            </thead>
            <tbody>
              {analytics.monthlyProjection
                .filter(p => p.avgDailyConsumption > 0)
                .slice(0, 20)
                .map(product => (
                  <tr key={product.sku} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-gray-800">{product.description}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center font-semibold text-gray-800">
                      {product.avgDailyConsumption.toFixed(1)}
                    </td>
                    <td className="p-3 text-center text-gray-600">
                      {product.monthlyConsumption.toFixed(0)}
                    </td>
                    <td className="p-3 text-center text-gray-600">
                      {product.quarterlyConsumption.toFixed(0)}
                    </td>
                    <td className="p-3 text-center text-gray-600">
                      {product.yearlyConsumption.toFixed(0)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-medium ${
                        product.currentStock < product.monthlyConsumption ? 'text-red-700' :
                        product.currentStock < product.quarterlyConsumption ? 'text-orange-700' :
                        'text-green-700'
                      }`}>
                        {product.currentStock}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color, icon }) {
  const colors = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-6`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-medium text-gray-700">{title}</p>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
    </div>
  );
}

function CategoryBar({ category, consumption, productCount, maxConsumption }) {
  const percentage = (consumption / maxConsumption) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-800">{category}</span>
        <span className="text-xs text-gray-600">
          {consumption.toFixed(0)} units/day • {productCount} products
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-500 to-blue-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
