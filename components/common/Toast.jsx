// components/common/Toast.jsx
'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

let toastQueue = [];
let updateToast = null;

export function toast(message, type = 'info') {
  toastQueue.push({ message, type, id: Date.now() });
  if (updateToast) updateToast([...toastQueue]);
  
  setTimeout(() => {
    toastQueue = toastQueue.slice(1);
    if (updateToast) updateToast([...toastQueue]);
  }, 3000);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    updateToast = setToasts;
    return () => {
      updateToast = null;
    };
  }, []);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-left ${
            t.type === 'success' ? 'bg-green-600' :
            t.type === 'error' ? 'bg-red-600' :
            t.type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}
