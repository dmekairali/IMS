// contexts/DataContext.jsx - Global data cache for orders and products
'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Initial fetch on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    // If we have data and not forcing refresh, skip fetch
    if (orders.length > 0 && !forceRefresh) {
      console.log('📦 Using cached data');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching fresh data from server...');
      
      // Fetch orders and products in parallel
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch('/api/orders/list', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch('/api/products/list', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
      ]);

      if (!ordersResponse.ok || !productsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const ordersData = await ordersResponse.json();
      const productsData = await productsResponse.json();

      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
      setLastFetched(new Date());
      
      console.log(`✅ Data fetched: ${ordersData.orders?.length || 0} orders, ${productsData.products?.length || 0} products`);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orders.length]);

  const refreshData = useCallback(async () => {
    console.log('🔄 Force refresh requested');
    await fetchAllData(true);
  }, [fetchAllData]);

  // Update a specific order optimistically (for dispatch, packing, etc.)
  const updateOrder = useCallback((orderId, updates) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.orderId === orderId 
          ? { ...order, ...updates }
          : order
      )
    );
  }, []);

  // Remove an order from the list (for dispatch completion)
  const removeOrder = useCallback((orderId) => {
    setOrders(prevOrders => 
      prevOrders.filter(order => order.orderId !== orderId)
    );
  }, []);

  const value = {
    orders,
    products,
    loading,
    error,
    lastFetched,
    refreshData,
    updateOrder,
    removeOrder
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
