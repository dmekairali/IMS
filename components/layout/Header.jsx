// components/layout/Header.jsx
'use client';
import OfflineIndicator from '../common/OfflineIndicator';

export default function Header() {
  return (
    <header className="bg-white border-b sticky top-0 z-20">
      <OfflineIndicator />
      <div className="flex items-center justify-between p-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Ayur Inventory</h1>
          <p className="text-xs text-gray-500">Dispatch Management</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
