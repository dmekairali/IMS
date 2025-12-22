// components/orders/DispatchModal.jsx
'use client';
import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { toast } from '../common/Toast';

export default function DispatchModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [canDispatch, setCanDispatch] = useState(false);
  const [dispatchPlan, setDispatchPlan] = useState([]);
  const [shortageItems, setShortageItems] = useState([]);

  useEffect(() => {
    checkAvailability();
  }, [order]);

  async function checkAvailability() {
    setLoading(true);
    
    try {
      const checks = await Promise.all(
        order.items.map(async (item) => {
          const response = await fetch(`/api/batches/available?product=${encodeURIComponent(item.productName)}`);
          const data = await response.json();
          
          const totalAvailable = data.batches.reduce((sum, batch) => sum + batch.availableQty, 0);
          const qtyNeeded = item.quantityOrdered - (item.quantityDispatched || 0);
          
          return {
            productName: item.productName,
            needed: qtyNeeded,
            available: totalAvailable,
            canFulfill: totalAvailable >= qtyNeeded,
            shortage: qtyNeeded - totalAvailable,
            batches: data.batches
          };
        })
      );

      // Check if ALL items can be fully fulfilled
      const allAvailable = checks.every(check => check.canFulfill);
      setCanDispatch(allAvailable);
      
      // Track items with shortage
      const itemsWithShortage = checks.filter(check => !check.canFulfill);
      setShortageItems(itemsWithShortage);
      
      // Show toast if shortage exists
      if (itemsWithShortage.length > 0) {
        toast(`Cannot dispatch: Insufficient stock for ${itemsWithShortage.length} item(s)`, 'error');
      }

      // Generate dispatch plan only if all available
      const plan = checks.map(check => {
        let remaining = check.needed;
        const allocations = [];
        
        for (const batch of check.batches) {
          if (remaining <= 0) break;
          const qtyFromBatch = Math.min(batch.availableQty, remaining);
          allocations.push({
            batchNo: batch.batchNo,
            qty: qtyFromBatch,
            expiryDate: batch.expiryDate
          });
          remaining -= qtyFromBatch;
        }
        
        return {
          productName: check.productName,
          allocations,
          needed: check.needed,
          available: check.available,
          shortage: remaining > 0 ? remaining : 0
        };
      });
      
      setDispatchPlan(plan);
    } catch (error) {
      toast('Error checking availability', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoDispatch() {
    if (!canDispatch) {
      toast('Cannot dispatch - insufficient stock for complete order', 'error');
      return;
    }

    setLoading(true);

    try {
      for (const plan of dispatchPlan) {
        const response = await fetch('/api/orders/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.orderId,
            productName: plan.productName,
            dispatches: plan.allocations
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Dispatch failed');
        }
      }

      toast('Order dispatched successfully! ✓', 'success');
      onSuccess();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Auto Dispatch">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Order #{order.orderId}</h3>
          <p className="text-sm text-gray-600">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.items.length} items</p>
        </div>

        {/* Shortage Alert - Show at top if exists */}
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
                      <span className="font-semibold">{item.productName}:</span> Need {item.needed}, Available {item.available} 
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
                  <h4 className="font-semibold text-gray-800">{plan.productName}</h4>
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
                    <p className="text-xs font-semibold text-gray-700 mb-1">Batch Allocation:</p>
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

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAutoDispatch}
            disabled={!canDispatch || loading}
            className="flex-1"
          >
            {loading ? 'Dispatching...' : canDispatch ? 'Confirm Full Dispatch' : 'Cannot Dispatch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
