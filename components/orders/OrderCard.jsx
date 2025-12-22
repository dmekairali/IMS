// components/orders/OrderCard.jsx - Add dispatch lock
'use client';
import { useState } from 'react';
import OrderDetails from './OrderDetails';
import DispatchModal from './DispatchModal';
import { formatDate } from '@/lib/utils';

export default function OrderCard({ order, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const getStatusColor = (status) => {
    if (status === '100%') return 'bg-green-100 text-green-800 border-green-200';
    if (status === '0%') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getUrgencyIndicator = () => {
    const daysSinceOrder = (new Date() - new Date(order.orderDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceOrder > 3) return '🔴';
    if (daysSinceOrder > 1) return '🟡';
    return '🟢';
  };

  // Check if order is completed or currently being dispatched
  const isLocked = order.dispatchStatus === '100%' || order.status === 'Completed' || isDispatching;

  const handleDispatchClick = () => {
    if (isLocked) return;
    setShowDispatchModal(true);
  };

  const handleDispatchSuccess = () => {
    setIsDispatching(true); // Lock immediately
    setShowDispatchModal(false);
    onRefresh();
  };

  return (
    <>
      <div className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all ${
        isLocked ? 'border-gray-300 opacity-60' : 'border-gray-100'
      }`}>
        {isLocked && (
          <div className="bg-green-600 text-white text-xs font-bold py-1 px-4 text-center">
            ✓ DISPATCHED - ORDER LOCKED
          </div>
        )}
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getUrgencyIndicator()}</span>
                <h3 className="font-bold text-lg text-gray-800">{order.customerName}</h3>
              </div>
              <p className="text-sm text-gray-500">Order #{order.orderId}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(order.orderDate)}</p>
            </div>
            
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(order.dispatchStatus)}`}>
              {order.dispatchStatus} Complete
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-semibold text-gray-800">{order.items.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Total Quantity:</span>
              <span className="font-semibold text-gray-800">{order.totalQuantity} units</span>
            </div>
            {order.partiallyDispatched > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Dispatched:</span>
                <span className="font-semibold text-green-600">{order.partiallyDispatched} units</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDispatchClick}
              disabled={isLocked}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold transition-all shadow-sm ${
                isLocked 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white active:from-blue-700 active:to-blue-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isLocked ? 'Dispatched' : 'Auto Dispatch'}
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-lg font-semibold active:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {isExpanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50">
            <OrderDetails order={order} />
          </div>
        )}
      </div>

      {showDispatchModal && !isLocked && (
        <DispatchModal
          order={order}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={handleDispatchSuccess}
        />
      )}
    </>
  );
}
