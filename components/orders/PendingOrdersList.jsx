// components/orders/PendingOrdersList.jsx
'use client';
import { useState, useEffect } from 'react';
import OrderCard from './OrderCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import EmptyState from '../common/EmptyState';
import { useOrders } from '@/hooks/useOrders';

export default function PendingOrdersList() {
  const { orders, loading, error, refreshOrders } = useOrders();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ordersWithStockStatus, setOrdersWithStockStatus] = useState([]);
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    if (orders.length > 0) {
      checkAllOrdersStock();
    }
  }, [orders]);

  async function checkAllOrdersStock() {
    setCheckingStock(true);
    
    const ordersWithStatus = await Promise.all(
      orders.map(async (order) => {
        try {
          const checks = await Promise.all(
            order.items.map(async (item) => {
              const response = await fetch(`/api/batches/available?product=${encodeURIComponent(item.productName)}`);
              const data = await response.json();
              
              const totalAvailable = data.batches.reduce((sum, batch) => sum + batch.availableQty, 0);
              const qtyNeeded = item.quantityOrdered - (item.quantityDispatched || 0);
              
              return {
                productName: item.productName,
                needed: qtyNeeded,
                available: totalAvailable,
                shortage: qtyNeeded > totalAvailable ? qtyNeeded - totalAvailable : 0
              };
            })
          );

          const itemsWithShortage = checks.filter(check => check.shortage > 0);
          
          return {
            ...order,
            canDispatch: itemsWithShortage.length === 0,
            shortageInfo: itemsWithShortage
          };
        } catch (error) {
          console.error('Error checking stock for order:', order.orderId, error);
          return { ...order, canDispatch: true, shortageInfo: [] };
        }
      })
    );

    setOrdersWithStockStatus(ordersWithStatus);
    setCheckingStock(false);
  }

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
  if (error) return <ErrorMessage message={error} onRetry={refreshOrders} />;

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
              onRefresh={refreshOrders}
              canDispatch={order.canDispatch}
              shortageInfo={order.shortageInfo}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-24 right-4">
        <button
          onClick={() => {
            refreshOrders();
            checkAllOrdersStock();
          }}
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
