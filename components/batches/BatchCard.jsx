// components/batches/BatchCard.jsx
'use client';
import { useState } from 'react';

export default function BatchCard({ batch, selected, onSelect, expiryWarning }) {
  const [quantity, setQuantity] = useState(selected);

  const handleQuantityChange = (value) => {
    const newQty = Math.max(0, Math.min(batch.availableQty, value));
    setQuantity(newQty);
    onSelect(batch, newQty);
  };

  const isExpiringSoon = expiryWarning?.includes('Expiring');
  const isRecommended = expiryWarning?.includes('Use First');

  return (
    <div className={`relative bg-white rounded-lg p-4 border-2 transition-all ${
      selected > 0 ? 'border-blue-500 shadow-md' : 'border-gray-200'
    } ${isExpiringSoon ? 'bg-red-50' : isRecommended ? 'bg-yellow-50' : ''}`}>
      
      {/* Batch Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-800">{batch.batchNo}</h4>
            {expiryWarning && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isExpiringSoon ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {expiryWarning}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Mfg: {new Date(batch.mfgDate).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</p>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-gray-600">Available</p>
          <p className="text-xl font-bold text-gray-800">{batch.availableQty}</p>
          <p className="text-xs text-gray-500">{batch.location}</p>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleQuantityChange(quantity - 10)}
          className="w-10 h-10 bg-gray-200 rounded-lg font-bold text-gray-700 active:bg-gray-300"
        >
          -
        </button>
        
        <input
          type="number"
          value={quantity}
          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
          className="flex-1 text-center text-lg font-semibold py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          min="0"
          max={batch.availableQty}
        />
        
        <button
          onClick={() => handleQuantityChange(quantity + 10)}
          className="w-10 h-10 bg-gray-200 rounded-lg font-bold text-gray-700 active:bg-gray-300"
        >
          +
        </button>
        
        <button
          onClick={() => handleQuantityChange(batch.availableQty)}
          className="px-4 h-10 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700 whitespace-nowrap"
        >
          Max
        </button>
      </div>
    </div>
  );
}
