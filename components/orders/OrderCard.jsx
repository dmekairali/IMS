// components/orders/OrderCard.jsx - Update to receive props
'use client';
import { useState } from 'react';
import OrderDetails from './OrderDetails';
import DispatchModal from './DispatchModal';
import { formatDate } from '@/lib/utils';

export default function OrderCard({ order, onRefresh, canDispatch, shortageInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const getStatusColor = (status) => {
    if (status === 'Completed') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getUrgencyIndicator = () => {
    const daysSinceOrder = (new Date() - new Date(order.orderDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceOrder > 3) return '🔴';
    if (daysSinceOrder > 1) return '🟡';
    return '🟢';
  };

  const isLocked = order.status === 'Completed' || isDispatching;

  const handleDispatchClick = () => {
    if (isLocked || !canDispatch) return;
    setShowDispatchModal(true);
  };

  const handleDispatchSuccess = () => {
    setIsDispatching(true);
    setShowDispatchModal(false);
    onRefresh();
  };

  return (
    <>
      <div className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${
        isLocked ? 'border-2 border-gray-300 opacity-60' : 
        !canDispatch ? 'border-2 border-red-400' : 'border border-gray-100'
      }`}>
        {isLocked && (
          <div className="bg-green-600 text-white text-xs font-bold py-1 px-4 text-center">
            ✓ DISPATCHED - ORDER LOCKED
          </div>
        )}

        {!isLocked && !canDispatch && shortageInfo && shortageInfo.length > 0 && (
          <div className="bg-red-600 text-white text-xs font-bold py-2 px-4">
            <div className="flex items-center gap-2">
              <span>⚠️ INSUFFICIENT STOCK</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {shortageInfo.map((item, idx) => (
                <div key={idx} className="text-xs">
                  {item.productName}: Need {item.needed}, Available {item.available} (Short: {item.shortage})
                </div>
              ))}
            </div>
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
            
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
              {order.status}
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDispatchClick}
              disabled={isLocked || !canDispatch}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold transition-all shadow-sm ${
                isLocked 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                !canDispatch
                  ? 'bg-red-300 text-red-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white active:from-blue-700 active:to-blue-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isLocked ? 'Dispatched' : !canDispatch ? 'Out of Stock' : 'Dispatch'}
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

      {showDispatchModal && !isLocked && canDispatch && (
        <DispatchModal
          order={order}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={handleDispatchSuccess}
        />
      )}
    </>
  );
}
