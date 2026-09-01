'use client';

import { useEffect } from 'react';

export default function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    let cancelled = false;

    const cleanup = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if (!cancelled && 'caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }
    };

    cleanup().catch((error) => {
      console.warn('Unable to clear development service-worker cache:', error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
