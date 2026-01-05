// components/orders/OrderCard.jsx - Updated with Invoice Link and date format
'use client';
import { useState } from 'react';
import OrderDetails from './OrderDetails';
import DispatchModal from './DispatchModal';

export default function OrderCard({ order, onDispatchSuccess, canDispatch, shortageInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);

  const formatOrderDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      let date;
      
      // Check if date is in DD/MM/YYYY format (Google Sheets format)
      if (typeof dateString === 'string' && dateString.includes('/')) {
        // Parse DD/MM/YYYY HH:MM:SS format
        const [datePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        date = new Date(year, parseInt(month) - 1, day);
      } else {
        date = new Date(dateString);
      }
      
      // Validate date
      if (!date || isNaN(date.getTime())) {
        return dateString;
      }
      
      // Format as "2-May-2025"
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  const getUrgencyIndicator = () => {
    const daysSinceOrder = (new Date() - new Date(order.orderDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceOrder > 3) return '🔴';
    if (daysSinceOrder > 1) return '🟡';
    return '🟢';
  };

  const isLocked = order.status === 'Completed' || isDispatched;

  const handleDispatchClick = () => {
    if (isLocked || !canDispatch) return;
    setShowDispatchModal(true);
  };

  const handleDispatchSuccess = () => {
    // Optimistically mark as dispatched
    setIsDispatched(true);
    setShowDispatchModal(false);
    
    // Notify parent to remove from list
    if (onDispatchSuccess) {
      onDispatchSuccess(order.orderId);
    }
  };

  // Don't render if dispatched (removed from pending list)
  if (isDispatched) {
    return null;
  }

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
              <p className="text-xs text-gray-400 mt-1">📅 {formatOrderDate(order.orderDate)}</p>
              {order.mobile && (
                <p className="text-xs text-gray-400">📱 {order.mobile}</p>
              )}
            </div>
            
            {/* Invoice Link instead of Status Badge */}
            {order.invoiceLink ? (
              <a 
                href={order.invoiceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-semibold border border-green-200 hover:bg-green-200 transition-colors flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Invoice
              </a>
            ) : (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold border border-gray-200">
                No Invoice
              </span>
            )}
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
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Invoice Amount:</span>
              <span className="font-semibold text-green-700">₹{order.invoiceAmount?.toFixed(2)}</span>
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
