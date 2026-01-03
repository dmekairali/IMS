'use client';
import { useState, useMemo } from 'react';

export default function PackingForm({ order, products, onCancel, onSuccess }) {
  const [packingItems, setPackingItems] = useState(() => {
    // Initialize packing items from products
    const orderProducts = products.filter(p => p.oid === order.orderId);
    return orderProducts.map(product => ({
      sku: product.sku || '',
      productName: product.productName || '',
      package: product.package || '',
      orderedQty: parseInt(product.quantity) || 0,
      boxNo: 1,
    }));
  });

  const [generating, setGenerating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState({ packingListLink: '', stickerLink: '' });
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBoxNoChange = (index, value) => {
    const newItems = [...packingItems];
    newItems[index].boxNo = parseInt(value) || 1;
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

  const generatePackingDocuments = async () => {
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
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-24">
                    Qty
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-24">
                    Box No
                  </th>
                </tr>
              </thead>
              <tbody>
                {packingItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {getDisplayName(item.productName)}
                      <div className="text-xs text-gray-500 mt-1">{item.sku}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {item.package}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                      {item.orderedQty}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                        value={item.boxNo}
                        onChange={(e) => handleBoxNoChange(index, e.target.value)}
                        disabled={isCompleted}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total Boxes:</strong> {totalBoxes}
            </p>
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
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          {/* Animated Icon */}
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

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            Generating Documents
          </h3>
          
          <p className="text-sm text-gray-600 text-center mb-6">
            Please wait while we create your packing documents and upload them to Google Drive...
          </p>

          {/* Progress Steps */}
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
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={handleSuccessModalClose}
        />
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            Documents Generated Successfully!
          </h3>
          
          <p className="text-sm text-gray-600 text-center mb-6">
            Your packing documents have been created and saved to Google Drive.
          </p>

          {/* Document Links */}
          <div className="space-y-3 mb-6">
            <a
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

            <a
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

          {/* Info Banner */}
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

          {/* Close Button */}
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
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={() => setShowErrorModal(false)}
        />
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
            Generation Failed
          </h3>
          
          <p className="text-sm text-gray-600 text-center mb-6">
            There was an error generating your packing documents.
          </p>

          {/* Error Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-mono break-words">
              {errorMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowErrorModal(false)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowErrorModal(false);
                generatePackingDocuments();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
