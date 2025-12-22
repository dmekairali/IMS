// hooks/useBatches.js - Client-side cache
'use client';
import { useState, useCallback, useEffect } from 'react';

let globalBatchCache = null;
let cacheSubscribers = [];

export function useBatches() {
  const [batches, setBatches] = useState(globalBatchCache || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to cache updates
    const subscriber = (newBatches) => setBatches(newBatches);
    cacheSubscribers.push(subscriber);

    return () => {
      cacheSubscribers = cacheSubscribers.filter(s => s !== subscriber);
    };
  }, []);

  const loadBatches = useCallback(async (forceRefresh = false) => {
    if (globalBatchCache && !forceRefresh) {
      return globalBatchCache;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/batches/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      const data = await response.json();
      globalBatchCache = data.batches || [];
      
      // Notify all subscribers
      cacheSubscribers.forEach(sub => sub(globalBatchCache));
      
      return globalBatchCache;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching batches:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getBatchesBySKU = useCallback((sku) => {
    return (globalBatchCache || [])
      .filter(batch => batch.sku === sku && batch.remaining > 0)
      .sort((a, b) => new Date(a.expiryDate || a.batchDate) - new Date(b.expiryDate || b.batchDate));
  }, []);

  const reduceBatchQty = useCallback((batchNo, qty) => {
    if (!globalBatchCache) return;

    globalBatchCache = globalBatchCache.map(batch => 
      batch.batchNo === batchNo 
        ? { ...batch, remaining: batch.remaining - qty, outQty: batch.outQty + qty }
        : batch
    );

    // Notify all subscribers
    cacheSubscribers.forEach(sub => sub(globalBatchCache));
  }, []);

  return { 
    batches,
    loading, 
    error,
    loadBatches,
    getBatchesBySKU,
    reduceBatchQty
  };
}
