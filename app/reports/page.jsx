// app/reports/page.jsx - Comprehensive Inventory Status Report
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useBatches } from '@/hooks/useBatches';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';

export default function ReportsPage() {
  const { batches, loading, error, loadBatches } = useBatches();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('stock-asc');

  useEffect(() => {
    loadBatches(true);
  }, []);

  // Calculate inventory metrics - Group by product name
  const inventoryData = useMemo(() => {
    if (!batches || batches.length === 0) return {};

    const productMap = {};

    batches.forEach(batch => {
      const productName = batch.descriptionName || batch.batchDescription || 'Unknown Product';
      
      if (!productMap[productName]) {
        productMap[productName] = {
          productName: productName,
          skus: [], // Track all SKUs/package sizes
          totalStock: 0,
          batches: [],
          variants: {}, // Track stock by package size
          oldestBatchDate: null,
          newestBatchDate: null,
          avgAge: 0,
          nearExpiry: 0,
          healthy: 0
        };
      }

      const product = productMap[productName];
      product.totalStock += batch.remaining;
      
      // Track unique SKUs/package sizes
      if (!product.skus.includes(batch.sku)) {
        product.skus.push(batch.sku);
      }

      // Track stock by variant (package size)
      if (!product.variants[batch.sku]) {
        product.variants[batch.sku] = {
          sku: batch.sku,
          size: batch.size || 'Unknown',
          stock: 0,
          batches: []
        };
      }
      product.variants[batch.sku].stock += batch.remaining;
      
      if (batch.remaining > 0) {
        const batchDate = new Date(batch.expiryDate || batch.batchDate);
        const age = Math.floor((new Date() - batchDate) / (1000 * 60 * 60 * 24));
        const daysToExpiry = batch.expiryDate 
          ? Math.floor((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          : null;

        const batchInfo = {
          batchNo: batch.batchNo,
          sku: batch.sku,
          size: batch.size || 'Unknown',
          qty: batch.remaining,
          age: age,
          batchDate: batch.batchDate,
          expiryDate: batch.expiryDate,
          daysToExpiry: daysToExpiry
        };

        product.batches.push(batchInfo);
        product.variants[batch.sku].batches.push(batchInfo);

        // Track oldest/newest
        if (!product.oldestBatchDate || batchDate < product.oldestBatchDate) {
          product.oldestBatchDate = batchDate;
        }
        if (!product.newestBatchDate || batchDate > product.newestBatchDate) {
          product.newestBatchDate = batchDate;
        }

        // Count expiry status
        if (daysToExpiry !== null) {
          if (daysToExpiry < 90) {
            product.nearExpiry += batch.remaining;
          } else {
            product.healthy += batch.remaining;
          }
        }
      }
    });

    // Calculate average age
    Object.values(productMap).forEach(product => {
      if (product.batches.length > 0) {
        const totalAge = product.batches.reduce((sum, b) => sum + b.age, 0);
        product.avgAge = Math.floor(totalAge / product.batches.length);
      }
    });

    return productMap;
  }, [batches]);

  const products = useMemo(() => {
    let filtered = Object.values(inventoryData);

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === 'outofstock') {
      filtered = filtered.filter(p => p.totalStock === 0);
    } else if (filterStatus === 'lowstock') {
      filtered = filtered.filter(p => p.totalStock > 0 && p.totalStock < 100);
    } else if (filterStatus === 'nearexpiry') {
      filtered = filtered.filter(p => p.nearExpiry > 0);
    } else if (filterStatus === 'instock') {
      filtered = filtered.filter(p => p.totalStock > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'stock-asc':
          return a.totalStock - b.totalStock;
        case 'stock-desc':
          return b.totalStock - a.totalStock;
        case 'name-asc':
          return (a.productName || '').localeCompare(b.productName || '');
        case 'age-desc':
          return b.avgAge - a.avgAge;
        case 'expiry-asc':
          return a.nearExpiry - b.nearExpiry;
        default:
          return 0;
      }
    });

    return filtered;
  }, [inventoryData, searchQuery, filterStatus, sortBy]);

  // Summary metrics
  const summary = useMemo(() => {
    const allProducts = Object.values(inventoryData);
    return {
      totalProducts: allProducts.length,
      inStock: allProducts.filter(p => p.totalStock > 0).length,
      outOfStock: allProducts.filter(p => p.totalStock === 0).length,
      lowStock: allProducts.filter(p => p.totalStock > 0 && p.totalStock < 100).length,
      nearExpiry: allProducts.filter(p => p.nearExpiry > 0).length,
      totalUnits: allProducts.reduce((sum, p) => sum + p.totalStock, 0),
      totalBatches: batches?.filter(b => b.remaining > 0).length || 0
    };
  }, [inventoryData, batches]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <LoadingSpinner size="lg" message="Loading inventory data..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <ErrorMessage message={error} onRetry={() => loadBatches(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 Inventory Status Report</h1>
          <p className="text-sm text-gray-600">Real-time inventory analysis and stock management</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            icon="📦"
            label="Total Products"
            value={summary.totalProducts}
            color="blue"
          />
          <SummaryCard
            icon="✅"
            label="In Stock"
            value={summary.inStock}
            color="green"
          />
          <SummaryCard
            icon="❌"
            label="Out of Stock"
            value={summary.outOfStock}
            color="red"
          />
          <SummaryCard
            icon="⚠️"
            label="Low Stock"
            value={summary.lowStock}
            color="yellow"
          />
          <SummaryCard
            icon="🏷️"
            label="Total Units"
            value={summary.totalUnits.toLocaleString()}
            color="purple"
          />
          <SummaryCard
            icon="📋"
            label="Active Batches"
            value={summary.totalBatches}
            color="teal"
          />
          <SummaryCard
            icon="⏰"
            label="Near Expiry"
            value={summary.nearExpiry}
            color="orange"
          />
          <SummaryCard
            icon="💊"
            label="Healthy Stock"
            value={summary.inStock - summary.nearExpiry}
            color="green"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <FilterButton
                active={filterStatus === 'all'}
                onClick={() => setFilterStatus('all')}
                label={`All (${Object.keys(inventoryData).length})`}
              />
              <FilterButton
                active={filterStatus === 'instock'}
                onClick={() => setFilterStatus('instock')}
                label={`In Stock (${summary.inStock})`}
                color="green"
              />
              <FilterButton
                active={filterStatus === 'outofstock'}
                onClick={() => setFilterStatus('outofstock')}
                label={`Out of Stock (${summary.outOfStock})`}
                color="red"
              />
              <FilterButton
                active={filterStatus === 'lowstock'}
                onClick={() => setFilterStatus('lowstock')}
                label={`Low Stock (${summary.lowStock})`}
                color="yellow"
              />
              <FilterButton
                active={filterStatus === 'nearexpiry'}
                onClick={() => setFilterStatus('nearexpiry')}
                label={`Near Expiry (${summary.nearExpiry})`}
                color="orange"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="stock-asc">Stock: Low to High</option>
                <option value="stock-desc">Stock: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="age-desc">Age: Oldest First</option>
                <option value="expiry-asc">Expiry: Urgent First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600 font-medium">No products found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            products.map(product => (
              <ProductCard key={product.sku} product={product} />
            ))
          )}
        </div>

        {/* Floating Refresh Button */}
        <div className="fixed bottom-24 right-4 z-10">
          <button
            onClick={() => loadBatches(true)}
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform hover:shadow-xl"
            aria-label="Refresh inventory data"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800'
  };

  return (
    <div className={`${colors[color]} rounded-lg border-2 p-3 transition-transform active:scale-95`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function FilterButton({ active, onClick, label, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    orange: 'bg-orange-600'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active 
          ? `${colors[color]} text-white` 
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({ product }) {
  const [expanded, setExpanded] = useState(false);

  const stockStatus = product.totalStock === 0 
    ? { label: 'Out of Stock', color: 'red', icon: '❌' }
    : product.totalStock < 100
    ? { label: 'Low Stock', color: 'yellow', icon: '⚠️' }
    : { label: 'In Stock', color: 'green', icon: '✅' };

  const ageStatus = product.avgAge > 180
    ? { label: 'Old Stock', color: 'orange', icon: '⏰' }
    : product.avgAge > 90
    ? { label: 'Aging', color: 'yellow', icon: '⚡' }
    : { label: 'Fresh', color: 'green', icon: '🌟' };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div 
        className="p-4 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-1">{product.productName}</h3>
            <p className="text-xs text-gray-500">{product.skus.length} package size{product.skus.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={stockStatus} />
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricBox
            label="Total Stock"
            value={product.totalStock}
            color={stockStatus.color}
            unit="units"
          />
          <MetricBox
            label="Batches"
            value={product.batches.length}
            color="blue"
          />
          <MetricBox
            label="Avg Age"
            value={product.avgAge}
            color={ageStatus.color}
            unit="days"
          />
        </div>

        {/* Package Size Summary */}
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.values(product.variants).map((variant, index) => (
            <div 
              key={index}
              className={`px-2 py-1 rounded text-xs font-medium ${
                variant.stock === 0 
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : variant.stock < 50
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}
            >
              {variant.size}: {variant.stock}
            </div>
          ))}
        </div>

        {product.nearExpiry > 0 && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-center gap-2">
            <span className="text-orange-600">⚠️</span>
            <p className="text-xs text-orange-800 font-medium">
              {product.nearExpiry} units expiring within 90 days
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Package Size Sections */}
          {Object.entries(product.variants).map(([sku, variant], variantIndex) => (
            <div key={variantIndex} className="border-b border-gray-200 last:border-b-0">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-gray-800">{variant.size}</h4>
                      <p className="text-xs text-gray-500">SKU: {sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Stock</p>
                    <p className={`text-xl font-bold ${
                      variant.stock === 0 ? 'text-red-700' :
                      variant.stock < 50 ? 'text-yellow-700' :
                      'text-green-700'
                    }`}>
                      {variant.stock}
                    </p>
                  </div>
                </div>

                <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Batches ({variant.batches.length})
                </h5>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {variant.batches
                    .sort((a, b) => (a.daysToExpiry || 999999) - (b.daysToExpiry || 999999))
                    .map((batch, batchIndex) => (
                    <BatchRow key={batchIndex} batch={batch} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[status.color]}`}>
      {status.icon} {status.label}
    </span>
  );
}

function MetricBox({ label, value, color, unit }) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200'
  };

  return (
    <div className={`${colors[color]} rounded-lg border p-2 text-center`}>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">
        {value}
        {unit && <span className="text-xs font-normal text-gray-600 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function BatchRow({ batch }) {
  const expiryWarning = batch.daysToExpiry !== null && batch.daysToExpiry < 90;
  const expired = batch.daysToExpiry !== null && batch.daysToExpiry < 0;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      expired ? 'bg-red-50 border-red-300' :
      expiryWarning ? 'bg-orange-50 border-orange-300' :
      'bg-white border-gray-200'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-800 text-sm">{batch.batchNo}</p>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300">
            {batch.size}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-600">
            Mfg: {new Date(batch.batchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          {batch.expiryDate && (
            <p className={`text-xs font-medium ${
              expired ? 'text-red-800' :
              expiryWarning ? 'text-orange-800' :
              'text-gray-600'
            }`}>
              Exp: {new Date(batch.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        {batch.daysToExpiry !== null && (
          <p className={`text-xs mt-1 font-medium ${
            expired ? 'text-red-700' :
            expiryWarning ? 'text-orange-700' :
            'text-green-700'
          }`}>
            {expired ? `⚠️ Expired ${Math.abs(batch.daysToExpiry)} days ago` :
             expiryWarning ? `⏰ Expires in ${batch.daysToExpiry} days` :
             `✅ ${batch.daysToExpiry} days remaining`}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">Age: {batch.age} days</p>
      </div>
      <div className="text-right ml-3">
        <p className="text-xs text-gray-600">Qty</p>
        <p className="text-xl font-bold text-gray-800">{batch.qty}</p>
      </div>
    </div>
  );
}
