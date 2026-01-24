// hooks/useInventory.js - Custom hook for inventory management
'use client';
import { useState, useCallback } from 'react';

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadInventoryData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching inventory data...');
      const response = await fetch('/api/inventory/finished-goods', {
        cache: forceRefresh ? 'no-store' : 'default',
        headers: { 'Cache-Control': forceRefresh ? 'no-cache' : 'default' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setMetadata(data.metadata || {});
      
      console.log(`✅ Loaded ${data.products?.length || 0} products`);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    products,
    metadata,
    loading, 
    error,
    loadInventoryData
  };
}
