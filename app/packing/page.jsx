// app/packing/page.jsx - UPDATED VERSION - Replace your existing file
'use client';
import { useState, useEffect } from 'react';
import PackingOrdersList from '@/components/packing/PackingOrdersList';
import PackingForm from '@/components/packing/PackingFormNew';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';

export default function PackingPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Force fresh data on page load
    fetchData(true);
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      if (forceRefresh) {
        console.log('🔄 Packing Page - Forcing fresh data load...');
      }

      // Add cache busting parameter to force fresh data
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';

      // Fetch orders from DispatchData
      const ordersResponse = await fetch(`/api/orders/list${timestamp}`);
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      const ordersData = await ordersResponse.json();

      // Fetch products from All Form Data
      const productsResponse = await fetch(`/api/products/list${timestamp}`);
      if (!productsResponse.ok) throw new Error('Failed to fetch products');
      const productsData = await productsResponse.json();

      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
      
      console.log(`✅ Loaded ${ordersData.orders?.length || 0} orders and ${productsData.products?.length || 0} products`);
    } catch (err) {
      console.error('❌ Error fetching packing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered for packing page');
      await fetchData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
  };

  const handleCancel = () => {
    setSelectedOrder(null);
  };

  const handleSuccess = async () => {
    setSelectedOrder(null);
    // Force refresh after successful packing generation
    await fetchData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorMessage message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-4">
        {!selectedOrder ? (
          <>
            <PackingOrdersList 
              orders={orders} 
              onSelectOrder={handleOrderSelect}
            />
            
            {/* Refresh button */}
            <div className="fixed bottom-24 right-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`relative bg-teal-600 text-white p-4 rounded-full shadow-lg transition-all ${
                  refreshing ? 'opacity-75 cursor-not-allowed' : 'active:scale-95'
                }`}
                aria-label="Refresh packing list"
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
                  <span className="absolute -top-12 right-0 bg-teal-600 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Refreshing from Sheets...
                  </span>
                )}
              </button>
            </div>
          </>
        ) : (
          <PackingForm 
            order={selectedOrder}
            products={products}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}
