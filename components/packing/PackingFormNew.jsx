// components/packing/PackingFormNew.jsx - COMPLETE CORRECTED VERSION
'use client';
import { useState, useMemo } from 'react';

export default function PackingForm({ order, products, onCancel, onSuccess }) {
  const [packingItems, setPackingItems] = useState(() => {
    // Initialize packing items from products
    const orderProducts = products.filter(p => p.oid === order.orderId);
    return orderProducts.map((product, index) => ({
      id: Date.now() + index, // ✅ Unique ID for each row
      sku: product.sku || '',
      productName: product.productName || '',
      package: product.package || '',
      orderedQty: parseInt(product.quantity) || 0,
      originalQty: parseInt(product.quantity) || 0, // ✅ Track original quantity
      boxNo: 1,
    }));
  });

  const [generating, setGenerating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState({ packingListLink: '', stickerLink: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBoxNoChange = (id, value) => {
    const newItems = packingItems.map(item =>
      item.id === id ? { ...item, boxNo: parseInt(value) || 1 } : item
    );
    setPackingItems(newItems);
  };

  // ✅ NEW: Update quantity for a specific row
  const handleQuantityChange = (id, value) => {
    const newQty = parseInt(value) || 0;
    const newItems = packingItems.map(item =>
      item.id === id ? { ...item, orderedQty: newQty } : item
    );
    setPackingItems(newItems);
  };

  // ✅ NEW: Split product into multiple rows
  const handleSplitProduct = (id) => {
    const itemToSplit = packingItems.find(item => item.id === id);
    if (!itemToSplit) return;

    // Create a duplicate with half quantity (rounded down)
    const splitQty = Math.floor(itemToSplit.orderedQty / 2);
    const remainingQty = itemToSplit.orderedQty - splitQty;

    if (splitQty === 0 || remainingQty === 0) {
      setErrorMessage('Cannot split - quantity too small');
      setShowErrorModal(true);
      return;
    }

    const newItems = packingItems.flatMap(item => {
      if (item.id === id) {
        return [
          { ...item, orderedQty: remainingQty }, // Original row with remaining qty
          { 
            ...item, 
            id: Date.now() + Math.random(), // New unique ID
            orderedQty: splitQty,
            boxNo: item.boxNo + 1 // Next box number
          }
        ];
      }
      return item;
    });

    setPackingItems(newItems);
  };

  // ✅ NEW: Remove a split row
  const handleRemoveRow = (id) => {
    const itemToRemove = packingItems.find(item => item.id === id);
    if (!itemToRemove) return;

    // Don't allow removal if it's the only row for this SKU
    const sameSKUCount = packingItems.filter(item => item.sku === itemToRemove.sku).length;

    if (sameSKUCount <= 1) {
      setErrorMessage('Cannot remove the only row for this product');
      setShowErrorModal(true);
      return;
    }

    const newItems = packingItems.filter(item => item.id !== id);
    setPackingItems(newItems);
  };

  // Helper function to display only product name (before first " - ")
  const getDisplayName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' - ');
    return parts[0].trim();
  };

  const totalBoxes = useMemo(() => {
    if (packingItems.length === 0) return 0;
    return Math.max(...packingItems.map(item => item.boxNo));
  }, [packingItems]);

  // ✅ Validate quantities match original order
  const validateQuantities = () => {
    const quantityByProduct = {};
    
    // Sum quantities by SKU
    packingItems.forEach(item => {
      if (!quantityByProduct[item.sku]) {
        quantityByProduct[item.sku] = { total: 0, original: item.originalQty, name: item.productName };
      }
      quantityByProduct[item.sku].total += item.orderedQty;
    });

    // Check against original order
    for (const sku in quantityByProduct) {
      const { total, original, name } = quantityByProduct[sku];
      
      if (total !== original) {
        return {
          valid: false,
          message: `Quantity mismatch for ${getDisplayName(name)}:\nExpected: ${original}, Current Total: ${total}\n\nPlease adjust quantities to match the original order.`
        };
      }

      if (total === 0) {
        return {
          valid: false,
          message: `Zero quantity not allowed for ${getDisplayName(name)}`
        };
      }
    }

    return { valid: true };
  };

  const generatePackingDocuments = async () => {
    // ✅ Validate before generating
    const validation = validateQuantities();
    if (!validation.valid) {
      setErrorMessage(validation.message);
      setShowErrorModal(true);
      return;
    }

    if (packingItems.length === 0) return;

    setGenerating(true);
    setShowErrorModal(false);
    setErrorMessage('');

    try {
      const response = await fetch('/api/packing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: order,
          packingItems: packingItems,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate packing documents');
      }

      const data = await response.json();

      // Store links
      setGeneratedLinks({
        packingListLink: data.packingListLink,
        stickerLink: data.stickerLink
      });
      
      // Show success modal
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error generating packing documents:', error);
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    // Pass orderId and links to parent for optimistic update
    if (onSuccess) {
      onSuccess(order.orderId, generatedLinks.packingListLink, generatedLinks.stickerLink);
    }
  };

  // Check if order already has packing documents
  const isCompleted = order.hasPacking;

  // ✅ Get quantity summary for each SKU
  const getQuantitySummary = (sku) => {
    const items = packingItems.filter(item => item.sku === sku);
    const totalCurrent = items.reduce((sum, item) => sum + item.orderedQty, 0);
    const original = items[0]?.originalQty || 0;
    const isValid = totalCurrent === original;
    
    return { totalCurrent, original, isValid };
  };

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Order Details Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-semibold text-teal-600">Order Details</h5>
          {isCompleted && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
              ✓ COMPLETED
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order ID
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.orderId || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice No
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.invoiceNo || order.orderId || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name of Client
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.customerName || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.mobile || ''}
              readOnly
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Address
            </label>
            <textarea
              rows="2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.billingAddress || 'N/A'}
              readOnly
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Address
            </label>
            <textarea
              rows="2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={order.shippingAddress || 'N/A'}
              readOnly
            />
          </div>
        </div>

        {isCompleted && (
          <div className="mt-4 flex gap-2">
            {order.packingListLink && (
              <a 
                href={order.packingListLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                📄 View Packing List
              </a>
            )}
            {order.stickerLink && (
              <a 
                href={order.stickerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                🏷️ View Stickers
              </a>
            )}
          </div>
        )}
      </div>

      {/* Product Details Section */}
      {packingItems.length > 0 && (
        <div className="p-6">
          <h5 className="text-lg font-semibold text-teal-600 mb-4">Product Details</h5>
          
          {/* Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-semibold mb-1">
                  💡 Split Products Across Boxes
                </p>
                <p className="text-xs text-blue-800">
                  Use the <strong>✂️ Split</strong> button to divide a product into multiple boxes. Adjust quantities as needed. Total must match the original order quantity.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
                    Name of Product
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-24">
                    Package
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-28">
                    Qty
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-24">
                    Box No
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-28">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {packingItems.map((item, index) => {
                  const sameSKUItems = packingItems.filter(i => i.sku === item.sku);
                  const sameSKUCount = sameSKUItems.length;
                  const splitIndex = sameSKUItems.findIndex(i => i.id === item.id) + 1;
                  const summary = getQuantitySummary(item.sku);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {getDisplayName(item.productName)}
                            <div className="text-xs text-gray-500 mt-1">{item.sku}</div>
                            {sameSKUCount > 1 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-blue-600 font-semibold">
                                  📦 Split {splitIndex}/{sameSKUCount}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Quantity Status Indicator */}
                          {splitIndex === sameSKUCount && (
                            <div className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${
                              summary.isValid 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {summary.isValid ? '✓' : '⚠️'} {summary.totalCurrent}/{summary.original}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                        {item.package}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-center font-semibold"
                          value={item.orderedQty}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          disabled={isCompleted}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-center font-semibold"
                          value={item.boxNo}
                          onChange={(e) => handleBoxNoChange(item.id, e.target.value)}
                          disabled={isCompleted}
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          {/* Split Button */}
                          <button
                            onClick={() => handleSplitProduct(item.id)}
                            disabled={isCompleted || item.orderedQty < 2}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Split product across boxes"
                          >
                            ✂️ Split
                          </button>
                          
                          {/* Remove Button (only show if product is split) */}
                          {sameSKUCount > 1 && (
                            <button
                              onClick={() => handleRemoveRow(item.id)}
                              disabled={isCompleted}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Remove this split"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total Boxes:</strong> {totalBoxes}
            </p>
          </div>

          {/* Quantity Validation Summary */}
          <div className="mt-4">
            {Object.keys(packingItems.reduce((acc, item) => {
              acc[item.sku] = true;
              return acc;
            }, {})).map(sku => {
              const summary = getQuantitySummary(sku);
              const item = packingItems.find(i => i.sku === sku);
              
              if (!summary.isValid) {
                return (
                  <div key={sku} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900">
                          {getDisplayName(item.productName)}
                        </p>
                        <p className="text-xs text-red-800">
                          Current Total: <strong>{summary.totalCurrent}</strong> | 
                          Expected: <strong>{summary.original}</strong> | 
                          Difference: <strong className="text-red-600">
                            {summary.totalCurrent - summary.original > 0 ? '+' : ''}
                            {summary.totalCurrent - summary.original}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              ← Back to List
            </button>
            
            {!isCompleted && (
              <button
                onClick={generatePackingDocuments}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {generating ? 'Generating & Uploading...' : '📦 Generate & Save to Drive'}
              </button>
            )}

            {isCompleted && (
              <button
                onClick={generatePackingDocuments}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {generating ? 'Regenerating...' : '🔄 Regenerate Documents'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Loading Modal */}
    {generating && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            Generating Documents
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Please wait while we create your packing documents and upload them to Google Drive...
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">Creating packing list PDF</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.2s' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">Creating stickers PDF</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.4s' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">Uploading to Google Drive</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.6s' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-700">Saving links to sheet</p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Success Modal */}
    {showSuccessModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={handleSuccessModalClose}
        />
        <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            Documents Generated Successfully!
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Your packing documents have been created and saved to Google Drive.
          </p>
          <div className="space-y-3 mb-6">
            
              href={generatedLinks.packingListLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Packing List</p>
                <p className="text-xs text-gray-500">Click to view PDF</p>
              </div>
              <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            
              href={generatedLinks.stickerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Packing Stickers</p>
                <p className="text-xs text-gray-500">Click to view PDF</p>
              </div>
              <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-800">
                <strong>Order moved to completed!</strong> You can see it in the completed section now.
              </p>
            </div>
          </div>
          <button
            onClick={handleSuccessModalClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    )}

    {/* Error Modal */}
    {showErrorModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setShowErrorModal(false)}
        />
        <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            {errorMessage.includes('mismatch') ? 'Quantity Validation Failed' : 'Operation Failed'}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            {errorMessage.includes('mismatch') ? 'Please adjust quantities to match the original order.' : 'An error occurred. Please try again.'}
          </p>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 whitespace-pre-line">
              {errorMessage}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowErrorModal(false)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              Close
            </button>
            {!errorMessage.includes('mismatch') && (
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  generatePackingDocuments();
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-sm"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
