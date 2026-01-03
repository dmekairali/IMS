'use client';
import { useState, useEffect } from 'react';
import ConsignmentOrdersList from '@/components/consignment/ConsignmentOrdersList';
import ConsignmentUploadForm from '@/components/consignment/ConsignmentUploadForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';

export default function ConsignmentPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders from DispatchData
      const ordersResponse = await fetch('/api/orders/list', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      const ordersData = await ordersResponse.json();

      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
  };

  const handleCancel = () => {
    setSelectedOrder(null);
  };

  const handleSuccess = (orderId, imageLink) => {
    // Optimistically update the order in the list
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.orderId === orderId 
          ? {
              ...order,
              consignmentImageUrl: imageLink,
              hasConsignmentImage: true
            }
          : order
      )
    );

    // Close the form
    setSelectedOrder(null);
    
    console.log(`✅ Order ${orderId} updated with consignment image (client-side)`);
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
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-4">
        {!selectedOrder ? (
          <>
            <ConsignmentOrdersList 
              orders={orders} 
              onSelectOrder={handleOrderSelect}
            />
            
            {/* Floating Refresh Button */}
            <div className="fixed bottom-24 right-4 z-10">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-purple-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh consignment list"
              >
                {refreshing ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          <ConsignmentUploadForm 
            order={selectedOrder}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}
