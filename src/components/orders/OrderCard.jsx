// components/orders/OrderCard.jsx
'use client';
import { useState } from 'react';
import OrderDetails from './OrderDetails';
import { formatDate } from '@/lib/utils';

export default function OrderCard({ order, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

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

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 active:shadow-lg transition-shadow">
        {/* Card Header */}
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
            
            {/* Status Badge */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(order.dispatchStatus)}`}>
              {order.dispatchStatus} Complete
            </span>
          </div>

          {/* Order Summary */}
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowDispatchModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-lg font-semibold active:from-blue-700 active:to-blue-800 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto Dispatch
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

        {/* Expandable Details */}
        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50">
            <OrderDetails order={order} />
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <DispatchModal
          order={order}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={() => {
            setShowDispatchModal(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
