// components/reports/SalesPerformance.jsx - Sales Trends & Comparisons
'use client';
import { useMemo } from 'react';

export default function SalesPerformance({ products, subSection }) {
  const salesData = useMemo(() => {
    // Extract monthly sales data
    const productsSales = products.map(p => {
      const monthlySales = p.monthlySales || [];
      const quarterlySales = p.quarterlySales || [];
      
      return {
        ...p,
        monthlySales,
        quarterlySales,
        latestMonth: monthlySales[0]?.sales || 0,
        previousMonth: monthlySales[1]?.sales || 0,
        latestQuarter: quarterlySales[0]?.sales || 0,
        previousQuarter: quarterlySales[1]?.sales || 0
      };
    });

    // Calculate totals
    const totalCurrentMonth = productsSales.reduce((sum, p) => sum + p.latestMonth, 0);
    const totalPreviousMonth = productsSales.reduce((sum, p) => sum + p.previousMonth, 0);
    const totalCurrentQuarter = productsSales.reduce((sum, p) => sum + p.latestQuarter, 0);
    const totalPreviousQuarter = productsSales.reduce((sum, p) => sum + p.previousQuarter, 0);

    const monthGrowth = totalPreviousMonth > 0 
      ? ((totalCurrentMonth - totalPreviousMonth) / totalPreviousMonth * 100)
      : 0;
    
    const quarterGrowth = totalPreviousQuarter > 0
      ? ((totalCurrentQuarter - totalPreviousQuarter) / totalPreviousQuarter * 100)
      : 0;

    // Category breakdown
    const categoryPerformance = products.reduce((acc, p) => {
      const cat = p.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = {
          currentMonth: 0,
          previousMonth: 0,
          products: 0
        };
      }
      acc[cat].currentMonth += p.latestMonth || 0;
      acc[cat].previousMonth += p.previousMonth || 0;
      acc[cat].products++;
      return acc;
    }, {});

    // Top performers
    const topPerformers = [...productsSales]
      .filter(p => p.latestMonth > 0)
      .sort((a, b) => b.latestMonth - a.latestMonth)
      .slice(0, 10);

    // Bottom performers (need attention)
    const bottomPerformers = [...productsSales]
      .filter(p => p.currentStock > 0 && p.latestMonth === 0)
      .sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0))
      .slice(0, 10);

    return {
      productsSales,
      totalCurrentMonth,
      totalPreviousMonth,
      totalCurrentQuarter,
      totalPreviousQuarter,
      monthGrowth,
      quarterGrowth,
      categoryPerformance,
      topPerformers,
      bottomPerformers
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">💰 Sales Performance</h2>
        <p className="text-gray-600">Historical sales trends & month-over-month comparison</p>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GrowthCard
          title="Month-over-Month"
          current={salesData.totalCurrentMonth}
          previous={salesData.totalPreviousMonth}
          growth={salesData.monthGrowth}
          period="This Month vs Last Month"
        />
        <GrowthCard
          title="Quarter-over-Quarter"
          current={salesData.totalCurrentQuarter}
          previous={salesData.totalPreviousQuarter}
          growth={salesData.quarterGrowth}
          period="This Quarter vs Previous Quarter"
        />
      </div>

      {/* Category Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📂 Sales by Category</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                <th className="text-center p-3 font-semibold text-gray-700">Products</th>
                <th className="text-right p-3 font-semibold text-gray-700">Current Month</th>
                <th className="text-right p-3 font-semibold text-gray-700">Previous Month</th>
                <th className="text-right p-3 font-semibold text-gray-700">Change</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(salesData.categoryPerformance)
                .sort(([, a], [, b]) => b.currentMonth - a.currentMonth)
                .map(([category, data]) => {
                  const growth = data.previousMonth > 0
                    ? ((data.currentMonth - data.previousMonth) / data.previousMonth * 100)
                    : 0;
                  
                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{category}</td>
                      <td className="p-3 text-center text-gray-600">{data.products}</td>
                      <td className="p-3 text-right font-semibold text-gray-800">
                        {data.currentMonth.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-gray-600">
                        {data.previousMonth.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${
                          growth > 0 ? 'text-green-700' :
                          growth < 0 ? 'text-red-700' :
                          'text-gray-600'
                        }`}>
                          {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top 10 Best Sellers (This Month)</h3>
        <div className="space-y-2">
          {salesData.topPerformers.map((product, index) => (
            <div key={product.sku} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                'bg-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{product.description}</p>
                <p className="text-xs text-gray-500">{product.category} • {product.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-700">{product.latestMonth.toLocaleString()}</p>
                <p className="text-xs text-gray-500">units sold</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Performers - Need Attention */}
      {salesData.bottomPerformers.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-orange-900 mb-4">⚠️ Products with Zero Sales (This Month)</h3>
          <p className="text-sm text-orange-800 mb-4">
            These products have stock but no sales this month. Consider promotions or discounts.
          </p>
          <div className="space-y-2">
            {salesData.bottomPerformers.slice(0, 5).map(product => (
              <div key={product.sku} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{product.description}</p>
                  <p className="text-xs text-gray-500">{product.category} • {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{product.currentStock} units</p>
                  <p className="text-xs text-orange-700">₹{((product.stockValue || 0) / 1000).toFixed(0)}k value</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GrowthCard({ title, current, previous, growth, period }) {
  const isPositive = growth > 0;
  const isNegative = growth < 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      
      <div className="flex items-baseline gap-3 mb-4">
        <p className="text-3xl font-bold text-gray-800">{current.toLocaleString()}</p>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
          isPositive ? 'bg-green-100 text-green-800' :
          isNegative ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {isPositive ? '↑' : isNegative ? '↓' : '→'}
          {Math.abs(growth).toFixed(1)}%
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-3">
        <span>Previous:</span>
        <span className="font-semibold">{previous.toLocaleString()}</span>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">{period}</p>
    </div>
  );
}
