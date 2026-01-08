// components/orders/DispatchModal.jsx - FIXED: Read Dispatch From from sheet, make it readonly
'use client';
import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { toast } from '../common/Toast';
import { useBatches } from '@/hooks/useBatches';

export default function DispatchModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [canDispatch, setCanDispatch] = useState(false);
  const [dispatchPlan, setDispatchPlan] = useState([]);
  const [shortageItems, setShortageItems] = useState([]);
  
  // ✅ FIX: Read dispatchFrom from order data (from sheet), make it readonly
  const dispatchFrom = order.dispatchFrom || 'Factory'; // Default to Factory if not specified
  
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { getBatchesBySKU, reduceBatchQty } = useBatches();

  useEffect(() => {
    checkAvailability();
  }, [order]);

  function checkAvailability() {
    setLoading(true);
    
    try {
      const checks = order.items.map(item => {
        const availableBatches = getBatchesBySKU(item.sku);
        const totalAvailable = availableBatches.reduce((sum, batch) => sum + batch.remaining, 0);
        const qtyNeeded = item.quantityOrdered;
        
        return {
          productName: item.productName,
          sku: item.sku,
          needed: qtyNeeded,
          available: totalAvailable,
          canFulfill: totalAvailable >= qtyNeeded,
          shortage: qtyNeeded - totalAvailable,
          batches: availableBatches
        };
      });

      const allAvailable = checks.every(check => check.canFulfill);
      setCanDispatch(allAvailable);
      
      const itemsWithShortage = checks.filter(check => !check.canFulfill);
      setShortageItems(itemsWithShortage);
      
      if (itemsWithShortage.length > 0) {
        toast(`Cannot dispatch: Insufficient stock for ${itemsWithShortage.length} item(s)`, 'error');
      }

      // Auto-allocate batches using FEFO
      const plan = checks.map(check => {
        let remaining = check.needed;
        const allocations = [];
        
        for (const batch of check.batches) {
          if (remaining <= 0) break;
          const qtyFromBatch = Math.min(batch.remaining, remaining);
          allocations.push({
            batchNo: batch.batchNo,
            qty: qtyFromBatch,
            sku: check.sku,
            expiryDate: batch.expiryDate || batch.batchDate,
            productName: check.productName
          });
          remaining -= qtyFromBatch;
        }
        
        return {
          productName: check.productName,
          sku: check.sku,
          allocations,
          needed: check.needed,
          available: check.available,
          shortage: remaining > 0 ? remaining : 0,
          batches: check.batches
        };
      });
      
      setDispatchPlan(plan);
    } catch (error) {
      toast('Error checking availability', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleEditBatches = (product) => {
    setEditingProduct(product);
    setShowBatchSelector(true);
  };

  const handleBatchSelectionUpdate = (updatedAllocations) => {
    setDispatchPlan(prev => prev.map(plan => 
      plan.sku === editingProduct.sku 
        ? { ...plan, allocations: updatedAllocations }
        : plan
    ));
    setShowBatchSelector(false);
    setEditingProduct(null);
  };

  async function handleAutoDispatch() {
    // For stockist dispatches, no batch validation needed
    if (dispatchFrom !== 'Factory') {
      await handleStockistDispatch();
      return;
    }

    // For factory dispatches, validate batches
    if (!canDispatch) {
      toast('Cannot dispatch - insufficient stock for complete order', 'error');
      return;
    }

    // Validate: ensure we're not dispatching more than ordered
    for (const plan of dispatchPlan) {
      const totalToDispatch = plan.allocations.reduce((sum, alloc) => sum + alloc.qty, 0);
      if (totalToDispatch > plan.needed) {
        toast(`Error: Attempting to dispatch ${totalToDispatch} units but order only needs ${plan.needed} for ${plan.productName}`, 'error');
        return;
      }
    }

    setLoading(true);

    try {
      // Flatten all allocations
      const allDispatches = dispatchPlan.flatMap(plan => plan.allocations);

      // Optimistically reduce batch quantities client-side
      allDispatches.forEach(dispatch => {
        reduceBatchQty(dispatch.batchNo, dispatch.qty);
      });

      // Prepare FormData
      const formData = new FormData();
      formData.append('orderId', order.orderId);
      formData.append('dispatches', JSON.stringify(allDispatches));
      formData.append('dispatchFrom', dispatchFrom);

      // Send to server
      const response = await fetch('/api/orders/dispatch', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Dispatch failed');
      }

      toast('Order dispatched successfully! ✓', 'success');
      onSuccess();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStockistDispatch() {
    // Validate attachment for non-factory dispatches
    if (!attachmentFile) {
      toast('Please upload dispatch attachment (PDF/DOC/DOCX)', 'error');
      return;
    }

    setLoading(true);

    try {
      // Create dispatch entries without batch numbers for stockist
      const allDispatches = order.items.map(item => ({
        sku: item.sku,
        qty: item.quantityOrdered,
        productName: item.productName,
        batchNo: '' // No batch number for stockist dispatches
      }));

      // Prepare FormData
      const formData = new FormData();
      formData.append('orderId', order.orderId);
      formData.append('dispatches', JSON.stringify(allDispatches));
      formData.append('dispatchFrom', dispatchFrom);
      formData.append('attachment', attachmentFile);

      // Send to server
      const response = await fetch('/api/orders/dispatch', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Dispatch failed');
      }

      toast('Order dispatched successfully! ✓', 'success');
      onSuccess();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type)) {
      toast('Please upload a PDF or DOC/DOCX file', 'error');
      return;
    }

    setAttachmentFile(file);
  };

  return (
    <>
      <Modal onClose={onClose} title="Auto Dispatch">
        <div className="space-y-4 pb-20">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Order #{order.orderId}</h3>
            <p className="text-sm text-gray-600">{order.customerName}</p>
            <p className="text-sm text-gray-600">{order.items.length} items</p>
          </div>

          {/* ✅ FIX: Read-only Dispatch From field */}
          <div className={`rounded-lg p-4 border-2 ${
            dispatchFrom === 'Factory' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dispatch From <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              {/* Display icon based on dispatch from */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                dispatchFrom === 'Factory' ? 'bg-blue-600' : 'bg-orange-600'
              }`}>
                {dispatchFrom === 'Factory' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={dispatchFrom}
                  readOnly
                  className={`w-full px-4 py-2.5 border-2 rounded-lg font-semibold ${
                    dispatchFrom === 'Factory'
                      ? 'bg-blue-100 border-blue-300 text-blue-900'
                      : 'bg-orange-100 border-orange-300 text-orange-900'
                  } cursor-not-allowed`}
                />
              </div>
            </div>
            <div className={`mt-3 p-3 rounded-lg ${
              dispatchFrom === 'Factory' ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              <p className="text-xs text-gray-700 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {dispatchFrom === 'Factory' 
                    ? 'This order is configured for Factory dispatch. Batch tracking and FEFO allocation will be applied.'
                    : `This order is configured for ${dispatchFrom} dispatch. Please upload the dispatch document from the stockist.`
                  }
                </span>
              </p>
            </div>
          </div>

          {/* Attachment Upload for Non-Factory Dispatches */}
          {dispatchFrom !== 'Factory' && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dispatch Attachment <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleAttachmentChange}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
              />
              {attachmentFile && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {attachmentFile.name}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                Upload dispatch document from stockist (PDF, DOC, or DOCX)
              </p>
            </div>
          )}

          {/* Factory Dispatch - Show Batch Allocation */}
          {dispatchFrom === 'Factory' && (
            <>
              {!loading && shortageItems.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 mb-2">
                        Cannot Dispatch - Insufficient Stock
                      </p>
                      <div className="space-y-1">
                        {shortageItems.map((item, idx) => (
                          <div key={idx} className="text-xs text-red-800">
                            <span className="font-semibold">{item.productName} (SKU: {item.sku}):</span> Need {item.needed}, Available {item.available} 
                            <span className="font-bold text-red-900"> (Short: {item.shortage})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dispatchPlan.map((plan, index) => (
                    <div 
                      key={index} 
                      className={`border-2 rounded-lg p-3 ${
                        plan.shortage > 0 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-green-300 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">{plan.productName}</h4>
                          <p className="text-xs text-gray-600">SKU: {plan.sku}</p>
                        </div>
                        {plan.shortage > 0 ? (
                          <span className="text-xs px-2 py-1 bg-red-200 text-red-900 rounded-full font-bold">
                            ❌ Short: {plan.shortage}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-green-200 text-green-900 rounded-full font-bold">
                            ✓ Full Stock
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-2">
                        Required: <span className="font-semibold">{plan.needed}</span> | 
                        Available: <span className={`font-semibold ${plan.shortage > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {plan.available}
                        </span>
                      </div>
                      
                      {plan.allocations.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-gray-300">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-semibold text-gray-700">Batch Allocation (FEFO):</p>
                            <button
                              onClick={() => handleEditBatches(plan)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                          {plan.allocations.map((alloc, i) => (
                            <div key={i} className="text-xs text-gray-700 flex justify-between bg-white px-2 py-1 rounded">
                              <span>{alloc.batchNo}</span>
                              <span className="font-medium">{alloc.qty} units</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Stockist Dispatch - Simple Item List */}
          {dispatchFrom !== 'Factory' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Items to Dispatch:</p>
              {order.items.map((item, index) => (
                <div key={index} className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-800">{item.productName}</h4>
                      <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-800">{item.quantityOrdered} units</span>
                  </div>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Batch tracking not required for stockist dispatches. Please upload the dispatch document from stockist.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAutoDispatch}
              disabled={
                loading || 
                (dispatchFrom === 'Factory' && !canDispatch) ||
                (dispatchFrom !== 'Factory' && !attachmentFile)
              }
              className="flex-1"
            >
              {loading ? 'Dispatching...' : 
               dispatchFrom === 'Factory' ? (canDispatch ? 'Confirm Full Dispatch' : 'Cannot Dispatch') :
               'Confirm Stockist Dispatch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Selector Modal */}
      {showBatchSelector && editingProduct && (
        <BatchSelectorModal
          product={editingProduct}
          onClose={() => {
            setShowBatchSelector(false);
            setEditingProduct(null);
          }}
          onSave={handleBatchSelectionUpdate}
        />
      )}
    </>
  );
}

// Batch Selector Modal Component
function BatchSelectorModal({ product, onClose, onSave }) {
  const [allocations, setAllocations] = useState(product.allocations);

  const handleQtyChange = (index, newQty) => {
    const updatedAllocations = [...allocations];
    updatedAllocations[index].qty = parseInt(newQty) || 0;
    setAllocations(updatedAllocations);
  };

  const handleRemoveBatch = (index) => {
    const updatedAllocations = allocations.filter((_, i) => i !== index);
    setAllocations(updatedAllocations);
  };

  const handleAddBatch = (batch) => {
    const existingAllocation = allocations.find(a => a.batchNo === batch.batchNo);
    if (existingAllocation) {
      toast('Batch already added', 'warning');
      return;
    }

    setAllocations([...allocations, {
      batchNo: batch.batchNo,
      qty: 0,
      sku: product.sku,
      expiryDate: batch.expiryDate || batch.batchDate,
      productName: product.productName
    }]);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.qty, 0);
  const isValid = totalAllocated === product.needed;

  return (
    <Modal onClose={onClose} title={`Edit Batches - ${product.productName}`}>
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Required Quantity:</span>
            <span className="font-bold text-gray-900">{product.needed}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-700">Currently Allocated:</span>
            <span className={`font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
              {totalAllocated}
            </span>
          </div>
        </div>

        {/* Current Allocations */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Current Batch Allocation:</p>
          {allocations.map((alloc, index) => (
            <div key={index} className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{alloc.batchNo}</p>
                <p className="text-xs text-gray-600">Exp: {new Date(alloc.expiryDate).toLocaleDateString()}</p>
              </div>
              <input
                type="number"
                value={alloc.qty}
                onChange={(e) => handleQtyChange(index, e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                min="0"
              />
              <button
                onClick={() => handleRemoveBatch(index)}
                className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Available Batches */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Available Batches:</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {product.batches.map((batch, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-300 rounded-lg p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{batch.batchNo}</p>
                  <p className="text-xs text-gray-600">Available: {batch.remaining} | Exp: {new Date(batch.expiryDate || batch.batchDate).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleAddBatch(batch)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm font-medium"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {!isValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              {totalAllocated < product.needed 
                ? `Need ${product.needed - totalAllocated} more units` 
                : `Over-allocated by ${totalAllocated - product.needed} units`}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => onSave(allocations)}
            disabled={!isValid}
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
