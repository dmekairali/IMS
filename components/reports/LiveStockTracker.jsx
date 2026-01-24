// components/reports/LiveStockTracker.jsx - Real-time Stock Status Viewer
'use client';
import { useState, useMemo } from 'react';

export default function LiveStockTracker({ products }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('description');
  const [sortOrder, setSortOrder] = useState('asc');

  // Filter out discontinued products and prepare data
  const activeProducts = useMemo(() => {
    return products
      .filter(p => p.status !== 'Discontinue')
      .map(p => ({
        ...p,
        packingSize: `${p.size || ''} ${p.unit || ''}`.trim() || 'N/A',
        searchText: `${p.description} ${p.sku} ${p.subCategory}`.toLowerCase()
      }));
  }, [products]);

  // Get unique sub-categories for filter
  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map(p => p.subCategory).filter(Boolean));
    return ['all', ...Array.from(cats)].sort();
  }, [activeProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = activeProducts;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.searchText.includes(query));
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.subCategory === categoryFilter);
    }

    // Stock status filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (stockFilter) {
          case 'in-stock':
            return p.currentStock > 0;
          case 'out-of-stock':
            return p.currentStock === 0;
          case 'low':
            return p.stockStatus === 'LOW' || p.stockStatus === 'CRITICAL';
          case 'healthy':
            return p.stockStatus === 'HEALTHY';
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'description':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        case 'stock':
          aVal = a.currentStock || 0;
          bVal = b.currentStock || 0;
          break;
        case 'subCategory':
          aVal = a.subCategory || '';
          bVal = b.subCategory || '';
          break;
        case 'packing':
          aVal = a.packingSize;
          bVal = b.packingSize;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [activeProducts, searchQuery, categoryFilter, stockFilter, sortBy, sortOrder]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: filteredProducts.length,
      inStock: filteredProducts.filter(p => p.currentStock > 0).length,
      outOfStock: filteredProducts.filter(p => p.currentStock === 0).length,
      low: filteredProducts.filter(p => p.stockStatus === 'LOW' || p.stockStatus === 'CRITICAL').length,
    };
  }, [filteredProducts]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStockBadge = (product) => {
    if (product.currentStock === 0) {
      return <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full">OUT OF STOCK</span>;
    }
    
    switch (product.stockStatus) {
      case 'CRITICAL':
        return <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full">CRITICAL</span>;
      case 'LOW':
        return <span className="px-2 py-1 text-xs font-bold bg-orange-100 text-orange-800 rounded-full">LOW</span>;
      case 'HEALTHY':
        return <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full">HEALTHY</span>;
      case 'OVERSTOCKED':
        return <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">OVERSTOCKED</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">NORMAL</span>;
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📦 Live Stock Tracker</h2>
        <p className="text-teal-100 text-sm">Real-time inventory status • Excluding discontinued items</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Active</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-3xl font-bold text-green-700">{stats.inStock}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-3xl font-bold text-red-700">{stats.outOfStock}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-3xl font-bold text-orange-700">{stats.low}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Products
            </label>
            <input
              type="text"
              placeholder="Search by name, SKU, sub-category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Sub Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📂 Sub Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Sub Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="low">Low Stock</option>
              <option value="healthy">Healthy</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔀 Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="description">Product Name</option>
              <option value="stock">Stock Quantity</option>
              <option value="subCategory">Sub Category</option>
              <option value="packing">Packing Size</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || categoryFilter !== 'all' || stockFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm flex items-center gap-2">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-teal-900">×</button>
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                Sub Category: {categoryFilter}
                <button onClick={() => setCategoryFilter('all')} className="hover:text-blue-900">×</button>
              </span>
            )}
            {stockFilter !== 'all' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-2">
                Status: {stockFilter}
                <button onClick={() => setStockFilter('all')} className="hover:text-orange-900">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  onClick={() => handleSort('description')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Product
                    <SortIcon column="description" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('packing')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Packing Size
                    <SortIcon column="packing" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('subCategory')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Sub Category
                    <SortIcon column="subCategory" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('stock')}
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-2">
                    Current Stock
                    <SortIcon column="stock" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-sm">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.sku || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.description || 'N/A'}</p>
                        {product.sku && (
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">SKU: {product.sku}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.packingSize}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.subCategory || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {product.currentStock?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStockBadge(product)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with count */}
        {filteredProducts.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{filteredProducts.length}</span> of{' '}
              <span className="font-semibold">{activeProducts.length}</span> active products
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
