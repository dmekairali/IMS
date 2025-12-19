// hooks/useOfflineSync.js
'use client';
import { useState, useEffect } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'inventory-offline';
const DB_VERSION = 1;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    initDB();
    checkOnlineStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function initDB() {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { autoIncrement: true });
        }
      }
    });
    
    // Count pending items
    const count = await db.count('pendingSync');
    setPendingCount(count);
  }

  function checkOnlineStatus() {
    setIsOnline(navigator.onLine);
  }

  function handleOnline() {
    setIsOnline(true);
    syncPendingData();
  }

  function handleOffline() {
    setIsOnline(false);
  }

  async function addToQueue(action, data) {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.add('pendingSync', {
      action,
      data,
      timestamp: Date.now()
    });
    
    const count = await db.count('pendingSync');
    setPendingCount(count);
  }

  async function syncPendingData() {
    if (!navigator.onLine) return;

    const db = await openDB(DB_NAME, DB_VERSION);
    const tx = db.transaction('pendingSync', 'readonly');
    const store = tx.objectStore('pendingSync');
    const allPending = await store.getAll();

    for (const item of allPending) {
      try {
        // Process based on action type
        if (item.action === 'dispatch') {
          await fetch('/api/orders/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
        }

        // Remove from queue on success
        const deleteTx = db.transaction('pendingSync', 'readwrite');
        await deleteTx.objectStore('pendingSync').delete(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
      }
    }

    const count = await db.count('pendingSync');
    setPendingCount(count);
  }

  return { isOnline, pendingCount, addToQueue, syncPendingData };
}
