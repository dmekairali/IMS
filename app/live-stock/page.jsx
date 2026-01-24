// app/live-stock/page.jsx - Standalone Live Stock Tracker Page
'use client';
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';
import LiveStockTracker from '@/components/reports/LiveStockTracker';

export default function LiveStockPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load finished goods inventory data
      const response = await fetch('/api/inventory/finished-goods', {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const data = await response.json();
      setProducts(data.products || []);

      console.log('✅ Live Stock data loaded:', data.products?.length || 0);

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <LoadingSpinner size="lg" message="Loading live stock data..." fullScreen={true} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <ErrorMessage message={error} onRetry={loadData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <LiveStockTracker products={products} />

        {/* Floating Refresh Button */}
        <div className="fixed bottom-24 right-4 z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-teal-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh stock data"
          >
            <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
