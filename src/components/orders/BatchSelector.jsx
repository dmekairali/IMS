// components/batches/BatchSelector.jsx
'use client';
import { useState, useEffect } from 'react';
import { useBatches } from '@/hooks/useBatches';
import BatchCard from './BatchCard';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function BatchSelector({ product, orderId, onClose, onSuccess }) {
  const { getBatchesForProduct, loading } = useBatches();
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [totalSelected, setTotalSelected] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityNeeded = product.quantityOrdered - (product.quantityDispatched || 0);

  useEffect(() => {
    loadBatches();
  }, [product.productName]);

  async function loadBatches() {
    const data = await getBatchesForProduct(product.productName);
    // Sort by expiry date (FEFO - First Expiry, First Out)
    const sorted = data.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    setBatches(sorted);
  }

  useEffect(() => {
    const total = selectedBatches.reduce((sum, batch) => sum + batch.selectedQty, 0);
    setTotalSelected(total);
  }, [selectedBatches]);

  const handleBatchSelect = (batch, quantity) => {
    setSelectedBatches(prev => {
      const existing = prev.find(b => b.batchNo === batch.batchNo);
      if (existing) {
        if (quantity === 0) {
          return prev.filter(b => b.batchNo !== batch.batchNo);
        }
        return prev.map(b =>
          b.batchNo === batch.batchNo ? { ...b, selectedQty: quantity } : b
        );
      } else {
        return [...prev, { ...batch, selectedQty: quantity }];
      }
    });
  };

  const handleAutoSelect = () => {
    let remaining = quantityNeeded;
    const autoSelected = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      
      const qtyFromBatch = Math.min(batch.availableQty, remaining);
      autoSelected.push({ ...batch, selectedQty: qtyFromBatch });
      remaining -= qtyFromBatch;
    }

    setSelectedBatches(autoSelected);
  };

  const handleDispatch = async () => {
    if (totalSelected === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          productName: product.productName,
          dispatches: selectedBatches.map(b => ({
            batchNo: b.batchNo,
            qty: b.selectedQty
          }))
        })
      });

      if (!response.ok) throw new Error('Dispatch failed');

      onSuccess();
    } catch (error) {
      alert('Error dispatching: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpiryWarning = (expiryDate) => {
    const daysToExpiry = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry < 90) return '⚠️ Expiring Soon';
    if (daysToExpiry < 180) return '⚡ Use First';
    return null;
  };

  return (
    <Modal onClose={onClose} title={`Select Batches - ${product.productName}`}>
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-700">Quantity Needed:</span>
            <span className="text-2xl font-bold text-blue-700">{quantityNeeded}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Selected:</span>
            <span className={`text-2xl font-bold ${totalSelected >= quantityNeeded ? 'text-green-600' : 'text-orange-600'}`}>
              {totalSelected}
            </span>
          </div>
          {totalSelected < quantityNeeded && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ Still need {quantityNeeded - totalSelected} units
            </p>
          )}
        </div>

        {/* Auto Select Button */}
        <button
          onClick={handleAutoSelect}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold active:from-purple-700 active:to-purple-800 transition-all shadow-sm"
        >
          ⚡ Auto-Select (FEFO)
        </button>

        {/* Batches List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <LoadingSpinner />
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No batches available
            </div>
          ) : (
            batches.map(batch => (
              <BatchCard
                key={batch.batchNo}
                batch={batch}
                selected={selectedBatches.find(b => b.batchNo === batch.batchNo)?.selectedQty || 0}
                onSelect={handleBatchSelect}
                expiryWarning={getExpiryWarning(batch.expiryDate)}
              />
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={totalSelected === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Dispatching...' : `Dispatch ${totalSelected} Units`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
