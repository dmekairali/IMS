// components/orders/OrderDetails.jsx - Show package info
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
              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
              <p className="text-xs text-gray-500">Package: {item.package}</p>
              <p className="text-xs text-gray-500">MRP: ₹{item.mrp}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Qty</p>
              <p className="text-lg font-bold text-gray-800">{item.quantityOrdered}</p>
              <p className="text-xs text-green-700 font-semibold">₹{item.total?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
