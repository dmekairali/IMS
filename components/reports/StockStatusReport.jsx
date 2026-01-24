// components/reports/StockStatusReport.jsx - Current Stock Status with WIP & Reserved
'use client';
import { useMemo, useState } from 'react';

export default function StockStatusReport({ products, batches, subSection }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('stock-low-high');

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' ? true :
        filterStatus === 'oos' ? p.stockStatus === 'OUT_OF_STOCK' :
        filterStatus === 'critical' ? p.stockStatus === 'CRITICAL' :
        filterStatus === 'low' ? p.stockStatus === 'LOW' :
        filterStatus === 'healthy' ? p.stockStatus === 'HEALTHY' :
        filterStatus === 'overstocked' ? p.stockStatus === 'OVERSTOCKED' : true;
      
      return matchesSearch && matchesFilter;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'stock-low-high':
          return (a.currentStock || 0) - (b.currentStock || 0);
        case 'stock-high-low':
          return (b.currentStock || 0) - (a.currentStock || 0);
        case 'value-high-low':
          return (b.stockValue || 0) - (a.stockValue || 0);
        case 'name-az':
          return (a.description || '').localeCompare(b.description || '');
        case 'days-remaining':
          return (a.daysRemaining || 999) - (b.daysRemaining || 999);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      outOfStock: products.filter(p => p.stockStatus === 'OUT_OF_STOCK').length,
      critical: products.filter(p => p.stockStatus === 'CRITICAL').length,
      low: products.filter(p => p.stockStatus === 'LOW').length,
      healthy: products.filter(p => p.stockStatus === 'HEALTHY').length,
      overstocked: products.filter(p => p.stockStatus === 'OVERSTOCKED').length,
      totalValue: products.reduce((sum, p) => sum + (p.stockValue || 0), 0),
      totalStock: products.reduce((sum, p) => sum + (p.currentStock || 0), 0),
      totalReserved: products.reduce((sum, p) => sum + (p.reservedQty || 0), 0),
      totalWIP: products.reduce((sum, p) => sum + (p.qtyWIP || 0), 0),
    };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📦 Current Stock Status</h2>
        <p className="text-gray-600">Real-time inventory levels with WIP & Reserved quantities</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Stock"
          value={stats.totalStock.toLocaleString()}
          subValue={`${stats.total} products`}
          color="blue"
          icon="📊"
        />
        <SummaryCard
          label="Stock Value"
          value={`₹${(stats.totalValue / 100000).toFixed(1)}L`}
          subValue="Total inventory"
          color="green"
          icon="💰"
        />
        <SummaryCard
          label="Reserved"
          value={stats.totalReserved.toLocaleString()}
          subValue="Pending dispatch"
          color="orange"
          icon="🔒"
        />
        <SummaryCard
          label="WIP"
          value={stats.totalWIP.toLocaleString()}
          subValue="Manufacturing"
          color="purple"
          icon="⚙️"
        />
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Stock Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatusBadge label="Out of Stock" count={stats.outOfStock} color="red" />
          <StatusBadge label="Critical" count={stats.critical} color="orange" />
          <StatusBadge label="Low" count={stats.low} color="yellow" />
          <StatusBadge label="Healthy" count={stats.healthy} color="green" />
          <StatusBadge label="Overstocked" count={stats.overstocked} color="blue" />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Search Products</label>
            <input
              type="text"
              placeholder="Product, SKU, or Brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filter by Status */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Status ({stats.total})</option>
              <option value="oos">Out of Stock ({stats.outOfStock})</option>
              <option value="critical">Critical ({stats.critical})</option>
              <option value="low">Low ({stats.low})</option>
              <option value="healthy">Healthy ({stats.healthy})</option>
              <option value="overstocked">Overstocked ({stats.overstocked})</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="stock-low-high">Stock (Low → High)</option>
              <option value="stock-high-low">Stock (High → Low)</option>
              <option value="value-high-low">Value (High → Low)</option>
              <option value="name-az">Name (A → Z)</option>
              <option value="days-remaining">Days Remaining</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Product</th>
                <th className="text-center p-3 font-semibold text-gray-700">Current</th>
                <th className="text-center p-3 font-semibold text-gray-700">WIP</th>
                <th className="text-center p-3 font-semibold text-gray-700">Reserved</th>
                <th className="text-center p-3 font-semibold text-gray-700">Available</th>
                <th className="text-center p-3 font-semibold text-gray-700">Overall</th>
                <th className="text-center p-3 font-semibold text-gray-700">Value</th>
                <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                <th className="text-center p-3 font-semibold text-gray-700">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <ProductRow key={product.sku} product={product} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Showing {filteredProducts.length} of {stats.total} products
      </p>
    </div>
  );
}

function SummaryCard({ label, value, subValue, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-medium text-gray-700">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subValue}</p>
    </div>
  );
}

function StatusBadge({ label, count, color }) {
  const colors = {
    red: 'bg-red-100 text-red-800 border-red-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <div className={`${colors[color]} rounded-lg border p-3 text-center`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
    </div>
  );
}

function ProductRow({ product }) {
  const statusColors = {
    'OUT_OF_STOCK': 'bg-red-100 text-red-800 border-red-300',
    'CRITICAL': 'bg-orange-100 text-orange-800 border-orange-300',
    'LOW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'HEALTHY': 'bg-green-100 text-green-800 border-green-300',
    'OVERSTOCKED': 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-3">
        <div>
          <p className="font-medium text-gray-800">{product.description}</p>
          <p className="text-xs text-gray-500">{product.sku} • {product.brand}</p>
        </div>
      </td>
      <td className="p-3 text-center font-semibold text-gray-800">
        {product.currentStock || 0}
      </td>
      <td className="p-3 text-center text-gray-600">
        {product.qtyWIP || 0}
      </td>
      <td className="p-3 text-center text-gray-600">
        {product.reservedQty || 0}
      </td>
      <td className="p-3 text-center font-medium text-gray-800">
        {product.availableStock || 0}
      </td>
      <td className="p-3 text-center text-gray-600">
        {product.overallStock || 0}
      </td>
      <td className="p-3 text-center font-medium text-green-700">
        ₹{((product.stockValue || 0) / 1000).toFixed(0)}k
      </td>
      <td className="p-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[product.stockStatus]}`}>
          {product.stockStatus.replace('_', ' ')}
        </span>
      </td>
      <td className="p-3 text-center">
        {product.daysRemaining > 0 && product.daysRemaining < 999 ? (
          <span className={`font-bold ${
            product.daysRemaining <= 7 ? 'text-red-700' :
            product.daysRemaining <= 30 ? 'text-orange-700' :
            'text-gray-600'
          }`}>
            {product.daysRemaining}d
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}
