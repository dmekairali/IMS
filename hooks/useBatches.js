// hooks/useBatches.js
'use client';
import { useState, useCallback } from 'react';

export function useBatches() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBatchesForProduct = useCallback(async (productName) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/batches/available?product=${encodeURIComponent(productName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      const data = await response.json();
      return data.batches || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching batches:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/batches/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      const data = await response.json();
      return data.batches || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching batches:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { getBatchesForProduct, getAllBatches, loading, error };
}
