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
            batches: data.batches
          };
        })
      );

      const allAvailable = checks.every(check => check.canFulfill);
      setCanDispatch(allAvailable);
      
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
      toast('Cannot dispatch - insufficient stock', 'error');
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

      toast('Order dispatched successfully!', 'success');
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

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dispatchPlan.map((plan, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800">{plan.productName}</h4>
                  {plan.shortage > 0 ? (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                      Short: {plan.shortage}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                      ✓ Available
                    </span>
                  )}
                </div>
                
                {plan.allocations.length > 0 && (
                  <div className="space-y-1">
                    {plan.allocations.map((alloc, i) => (
                      <div key={i} className="text-sm text-gray-600 flex justify-between">
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

        {!loading && !canDispatch && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Cannot fully dispatch this order due to insufficient stock
            </p>
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
            {loading ? 'Dispatching...' : 'Confirm Dispatch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
