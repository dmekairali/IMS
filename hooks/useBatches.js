// hooks/useBatches.js - UPDATED VERSION - Replace your existing file
'use client';
import { useState, useCallback, useEffect } from 'react';

let globalBatchCache = null;
let cacheSubscribers = [];
let cacheTimestamp = null;
const CLIENT_CACHE_TTL = 30 * 1000; // 30 seconds to catch new data quickly

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
    // Check if cache is still valid
    const now = Date.now();
    const cacheValid = globalBatchCache && 
                       cacheTimestamp && 
                       (now - cacheTimestamp) < CLIENT_CACHE_TTL;
    
    if (cacheValid && !forceRefresh) {
      console.log('📦 Using cached batches (expires in', Math.round((CLIENT_CACHE_TTL - (now - cacheTimestamp)) / 1000), 'seconds)');
      return globalBatchCache;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching fresh batch data from server...');
      
      // If force refresh, clear server cache first
      if (forceRefresh) {
        console.log('🧹 Clearing server cache...');
        try {
          await fetch('/api/batches/clear-cache', { method: 'POST' });
        } catch (err) {
          console.warn('Could not clear server cache:', err.message);
        }
      }
      
      const response = await fetch('/api/batches/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      const data = await response.json();
      globalBatchCache = data.batches || [];
      cacheTimestamp = Date.now();
      
      console.log(`✅ Loaded ${globalBatchCache.length} batches ${data.fromCache ? '(from server cache)' : '(FRESH from Google Sheets)'}`);
      
      // Notify all subscribers
      cacheSubscribers.forEach(sub => sub(globalBatchCache));
      
      return globalBatchCache;
    } catch (err) {
      setError(err.message);
      console.error('❌ Error fetching batches:', err);
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

  const clearCache = useCallback(() => {
    console.log('🧹 Clearing client-side batch cache');
    globalBatchCache = null;
    cacheTimestamp = null;
    cacheSubscribers.forEach(sub => sub([]));
  }, []);

  return { 
    batches,
    loading, 
    error,
    loadBatches,
    getBatchesBySKU,
    reduceBatchQty,
    clearCache  // NEW: Add this export
  };
}
