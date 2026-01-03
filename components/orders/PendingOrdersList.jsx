// components/orders/PendingOrdersList.jsx - UPDATED VERSION - Replace your existing file
'use client';
import { useState, useEffect } from 'react';
import OrderCard from './OrderCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import EmptyState from '../common/EmptyState';
import { useOrders } from '@/hooks/useOrders';
import { useBatches } from '@/hooks/useBatches';

export default function PendingOrdersList() {
  const { orders, loading, error, refreshOrders } = useOrders();
  const { loadBatches, getBatchesBySKU, clearCache } = useBatches();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ordersWithStockStatus, setOrdersWithStockStatus] = useState([]);
  const [checkingStock, setCheckingStock] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      checkAllOrdersStock();
    }
  }, [orders]);

  async function initializePage() {
    // On page load, always fetch fresh data
    console.log('🚀 Initializing page - loading fresh data...');
    await loadBatches(true); // Force refresh on page load
  }

  function checkAllOrdersStock() {
    setCheckingStock(true);
    
    const ordersWithStatus = orders.map(order => {
      const checks = order.items.map(item => {
        const availableBatches = getBatchesBySKU(item.sku);
        const totalAvailable = availableBatches.reduce((sum, batch) => sum + batch.remaining, 0);
        const qtyNeeded = item.quantityOrdered;
        
        return {
          productName: item.productName,
          sku: item.sku,
          needed: qtyNeeded,
          available: totalAvailable,
          shortage: qtyNeeded > totalAvailable ? qtyNeeded - totalAvailable : 0
        };
      });

      const itemsWithShortage = checks.filter(check => check.shortage > 0);
      
      return {
        ...order,
        canDispatch: itemsWithShortage.length === 0,
        shortageInfo: itemsWithShortage
      };
    });

    setOrdersWithStockStatus(ordersWithStatus);
    setCheckingStock(false);
  }

  const handleFullRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Starting FULL REFRESH (clearing all caches)...');
      
      // Step 1: Clear client-side cache
      console.log('  Step 1: Clearing client cache...');
      clearCache();
      
      // Step 2: Clear server-side cache
      console.log('  Step 2: Clearing server cache...');
      try {
        await fetch('/api/batches/clear-cache', { method: 'POST' });
      } catch (err) {
        console.warn('  Warning: Could not clear server cache:', err.message);
      }
      
      // Step 3: Force fresh batch data load
      console.log('  Step 3: Loading fresh batch data from Google Sheets...');
      await loadBatches(true);
      
      // Step 4: Refresh orders
      console.log('  Step 4: Refreshing orders...');
      await refreshOrders();
      
      // Step 5: Recheck stock with fresh data
      console.log('  Step 5: Rechecking stock status...');
      checkAllOrdersStock();
      
      console.log('✅ FULL REFRESH COMPLETE!');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders = ordersWithStockStatus.filter(order => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? order.status === 'Pending' :
      filter === 'urgent' ? isUrgent(order.orderDate) :
      filter === 'outofstock' ? !order.canDispatch : true;
    
    return matchesSearch && matchesFilter;
  });

  if (loading || checkingStock) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={handleFullRefresh} />;

  const outOfStockCount = ordersWithStockStatus.filter(o => !o.canDispatch).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Pending Orders
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredOrders.length})
            </span>
          </h1>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search customer or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {['all', 'pending', 'urgent', 'outofstock'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              {f === 'outofstock' ? `Out of Stock${outOfStockCount > 0 ? ` (${outOfStockCount})` : ''}` : 
               f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <EmptyState message={
            filter === 'outofstock' 
              ? 'No orders with stock shortage' 
              : 'No orders found'
          } />
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.orderId} 
              order={order} 
              onRefresh={handleFullRefresh}
              canDispatch={order.canDispatch}
              shortageInfo={order.shortageInfo}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-24 right-4">
        <button
          onClick={handleFullRefresh}
          disabled={refreshing}
          className={`relative bg-blue-600 text-white p-4 rounded-full shadow-lg transition-all ${
            refreshing ? 'opacity-75 cursor-not-allowed' : 'active:scale-95'
          }`}
          aria-label="Refresh orders and batches"
        >
          <svg 
            className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing && (
            <span className="absolute -top-12 right-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              Refreshing from Sheets...
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function isUrgent(orderDate) {
  const daysDiff = (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24);
  return daysDiff > 2;
}
