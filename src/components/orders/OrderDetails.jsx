// components/orders/OrderDetails.jsx
'use client';
import { useState } from 'react';
import BatchSelector from '../batches/BatchSelector';

export default function OrderDetails({ order }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div className="p-4 space-y-3">
      {order.items.map((item, index) => (
        <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{item.productName}</h4>
              <p className="text-sm text-gray-500">{item.packSize}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Ordered</p>
              <p className="text-lg font-bold text-gray-800">{item.quantityOrdered}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Dispatched: {item.quantityDispatched || 0}</span>
              <span>Pending: {item.quantityOrdered - (item.quantityDispatched || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((item.quantityDispatched || 0) / item.quantityOrdered) * 100}%` }}
              />
            </div>
          </div>

          {/* Manual Dispatch Button */}
          {item.quantityOrdered > (item.quantityDispatched || 0) && (
            <button
              onClick={() => setSelectedProduct(item)}
              className="w-full bg-blue-50 text-blue-700 py-2.5 rounded-lg font-medium active:bg-blue-100 transition-colors"
            >
              Select Batches to Dispatch
            </button>
          )}
        </div>
      ))}

      {/* Batch Selector Modal */}
      {selectedProduct && (
        <BatchSelector
          product={selectedProduct}
          orderId={order.orderId}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => {
            setSelectedProduct(null);
            // Trigger refresh
          }}
        />
      )}
    </div>
  );
}
