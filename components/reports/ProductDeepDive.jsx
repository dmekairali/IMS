// components/reports/ProductDeepDive.jsx - Detailed Product Analysis
'use client';
import { useState, useMemo } from 'react';

export default function ProductDeepDive({ products, batches }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  if (selectedProduct) {
    return (
      <ProductDetails
        product={selectedProduct}
        batches={batches}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔍 Product Deep Dive</h2>
        <p className="text-gray-600">Comprehensive product-level analytics</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by product name, SKU, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No products found
          </div>
        ) : (
          filteredProducts.map(product => (
            <ProductCard
              key={product.sku}
              product={product}
              onClick={() => setSelectedProduct(product)}
            />
          ))
        )}
      </div>

      <p className="text-sm text-gray-500 text-center">
        Showing {filteredProducts.length} of {products.length} products
      </p>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  const statusColors = {
    'OUT_OF_STOCK': 'bg-red-100 text-red-800 border-red-300',
    'CRITICAL': 'bg-orange-100 text-orange-800 border-orange-300',
    'LOW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'HEALTHY': 'bg-green-100 text-green-800 border-green-300',
    'OVERSTOCKED': 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{product.description}</h3>
          <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ml-2 ${statusColors[product.stockStatus]}`}>
          {product.stockStatus.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-500">Current Stock</p>
          <p className="font-bold text-gray-800">{product.currentStock}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Available</p>
          <p className="font-bold text-gray-800">{product.availableStock}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Consumption/Day</p>
          <p className="font-bold text-gray-800">{(product.avgDailyConsumption || 0).toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Days Left</p>
          <p className={`font-bold ${
            product.daysRemaining <= 7 ? 'text-red-700' :
            product.daysRemaining <= 30 ? 'text-orange-700' :
            'text-green-700'
          }`}>
            {product.daysRemaining < 999 ? `${product.daysRemaining}d` : '∞'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-200">
        <span>{product.brand}</span>
        <span className="font-semibold text-green-700">₹{((product.stockValue || 0) / 1000).toFixed(0)}k</span>
      </div>
    </div>
  );
}

function ProductDetails({ product, batches, onBack }) {
  const productBatches = useMemo(() => {
    return batches
      .filter(b => b.sku === product.sku)
      .sort((a, b) => new Date(a.expiryDate || a.batchDate) - new Date(b.expiryDate || b.batchDate));
  }, [batches, product.sku]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{product.description}</h2>
          <p className="text-sm text-gray-500">SKU: {product.sku} • Brand: {product.brand}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Current Stock" value={product.currentStock} color="blue" />
        <MetricBox label="Reserved" value={product.reservedQty} color="orange" />
        <MetricBox label="WIP" value={product.qtyWIP} color="purple" />
        <MetricBox label="Available" value={product.availableStock} color="green" />
      </div>

      {/* Product Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Product Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Sub-Category" value={product.subCategory} />
          <InfoRow label="Size" value={product.size} />
          <InfoRow label="Unit" value={product.unit} />
          <InfoRow label="MRP" value={`₹${product.mrp}`} />
          <InfoRow label="Season" value={product.season} />
          <InfoRow label="Status" value={product.status} />
          <InfoRow label="Stock Value" value={`₹${((product.stockValue || 0) / 1000).toFixed(2)}k`} />
        </div>
      </div>

      {/* Consumption Data */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Consumption Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Avg Daily Consumption" value={`${(product.avgDailyConsumption || 0).toFixed(1)} units`} />
          <InfoRow label="Lead Time" value={`${product.leadTime} days`} />
          <InfoRow label="Reorder Point" value={`${product.reorderPoint.toFixed(0)} units`} />
          <InfoRow label="Safety Stock" value={`${product.safetyStock.toFixed(0)} units`} />
          <InfoRow label="Max Level" value={`${product.maxLevel} units`} />
          <InfoRow label="Days Remaining" value={`${product.daysRemaining < 999 ? product.daysRemaining + ' days' : 'N/A'}`} />
        </div>
      </div>

      {/* Stock Status */}
      <div className={`rounded-lg border-2 p-6 ${getStatusColorClass(product.stockStatus)}`}>
        <h3 className="text-lg font-bold mb-2">Stock Status: {product.stockStatus.replace('_', ' ')}</h3>
        <p className="text-sm">Movement Class: <strong>{product.movementClass}</strong></p>
        {product.stockoutDate && (
          <p className="text-sm mt-2">
            <strong>Estimated Stock-out Date:</strong> {new Date(product.stockoutDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Batch Information */}
      {productBatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🏷️ Batch Information ({productBatches.length} batches)</h3>
          <div className="space-y-2">
            {productBatches.map(batch => (
              <div key={batch.batchNo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{batch.batchNo}</p>
                  <p className="text-xs text-gray-500">
                    Exp: {new Date(batch.expiryDate || batch.batchDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{batch.remaining} units</p>
                  <p className="text-xs text-gray-500">Available</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-4`}>
      <p className="text-xs font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-800">{value || 'N/A'}</span>
    </div>
  );
}

function getStatusColorClass(status) {
  const colors = {
    'OUT_OF_STOCK': 'bg-red-50 border-red-300',
    'CRITICAL': 'bg-orange-50 border-orange-300',
    'LOW': 'bg-yellow-50 border-yellow-300',
    'HEALTHY': 'bg-green-50 border-green-300',
    'OVERSTOCKED': 'bg-blue-50 border-blue-300'
  };
  return colors[status] || 'bg-gray-50 border-gray-300';
}
