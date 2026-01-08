// components/orders/PendingOrdersList.jsx - UPDATED: Completely exclude dispatched orders
'use client';
import { useState, useEffect } from 'react';
import OrderCard from './OrderCard';
import LoadingSpinner from '../common/LoadingSpinner';
import OrdersSkeleton from '../common/OrdersSkeleton';
import ErrorMessage from '../common/ErrorMessage';
import EmptyState from '../common/EmptyState';
import { useData } from '@/contexts/DataContext';
import { useBatches } from '@/hooks/useBatches';

export default function PendingOrdersList() {
  const { orders, loading, error, refreshData } = useData();
  const { loadBatches, getBatchesBySKU } = useBatches();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ordersWithStockStatus, setOrdersWithStockStatus] = useState([]);
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      checkAllOrdersStock();
    }
  }, [orders]);

  async function initializePage() {
    await loadBatches();
  }

  function checkAllOrdersStock() {
    setCheckingStock(true);
    
    // ✅ MAJOR CHANGE: Filter out both cancelled AND dispatched orders
    const activeOrders = orders.filter(order => 
      order.status !== 'Order Cancel' && !order.dispatched
    );
    
    const ordersWithStatus = activeOrders.map(order => {
      // Check stock for all remaining orders
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

  const handleRefresh = async () => {
    await loadBatches(true);
    await refreshData();
    checkAllOrdersStock();
  };

  const filteredOrders = ordersWithStockStatus.filter(order => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // ✅ SIMPLIFIED: No need to check for dispatched since they're already excluded
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? order.canDispatch : // Orders with available stock
      filter === 'urgent' ? isUrgent(order.orderDate) :
      filter === 'outofstock' ? !order.canDispatch : true; // Orders with insufficient stock
    
    return matchesSearch && matchesFilter;
  });

  // Show skeleton loader instead of spinner
  if (loading || checkingStock) return <OrdersSkeleton />;
  
  if (error) return <ErrorMessage message={error} onRetry={handleRefresh} />;

  // ✅ SIMPLIFIED: Calculate counts (all orders are non-dispatched now)
  const pendingCount = ordersWithStockStatus.filter(o => o.canDispatch).length;
  const outOfStockCount = ordersWithStockStatus.filter(o => !o.canDispatch).length;
  const urgentCount = ordersWithStockStatus.filter(o => isUrgent(o.orderDate)).length;

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
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            All ({ordersWithStockStatus.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'pending' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            ✓ Ready to Dispatch ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'urgent' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            🔴 Urgent ({urgentCount})
          </button>
          <button
            onClick={() => setFilter('outofstock')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'outofstock' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            ⚠️ Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <EmptyState message={
            filter === 'outofstock' 
              ? 'No orders with stock shortage' 
              : filter === 'pending'
              ? 'No orders ready to dispatch'
              : filter === 'urgent'
              ? 'No urgent orders'
              : 'No pending orders found'
          } />
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.orderId} 
              order={order} 
              onRefresh={handleRefresh}
              canDispatch={order.canDispatch}
              shortageInfo={order.shortageInfo}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-24 right-4">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform"
          aria-label="Refresh orders"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function isUrgent(orderDate) {
  const daysDiff = (new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24);
  return daysDiff > 2;
}
