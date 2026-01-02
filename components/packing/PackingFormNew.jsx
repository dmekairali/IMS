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

      alert(`✓ Packing documents generated successfully!

📄 Packing List: ${data.packingListLink}
🏷️ Stickers: ${data.stickerLink}

Links have been saved to DispatchData sheet.`);

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error generating packing documents:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Check if order already has packing documents
  const isCompleted = order.hasPacking;

  return (
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
  );
}
