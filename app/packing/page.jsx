'use client';
import { useState, useEffect } from 'react';
import PackingOrdersList from '@/components/packing/PackingOrdersList';
import PackingForm from '@/components/packing/PackingFormNew';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useData } from '@/contexts/DataContext';

export default function PackingPage() {
  const { orders, products, loading, error, refreshData, updateOrder } = useData();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
  };

  const handleCancel = () => {
    setSelectedOrder(null);
  };

  const handleSuccess = (orderId, packingListLink, stickerLink) => {
    // Optimistically update the order in global cache
    updateOrder(orderId, {
      hasPacking: true,
      packingListLink: packingListLink,
      stickerLink: stickerLink
    });

    // Close the form
    setSelectedOrder(null);
    
    console.log(`✅ Order ${orderId} updated to completed status (client-side)`);
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
        <ErrorMessage message={error} onRetry={refreshData} />
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
            
            {/* Floating Refresh Button */}
            <div className="fixed bottom-24 right-4 z-10">
              <button
                onClick={refreshData}
                className="bg-teal-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform"
                aria-label="Refresh packing list"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
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
