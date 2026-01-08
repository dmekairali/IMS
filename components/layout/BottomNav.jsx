// components/layout/BottomNav.jsx - UPDATED VERSION with Reports enabled
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { 
      name: 'Orders', 
      path: '/', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      disabled: false
    },
    { 
      name: 'Packing', 
      path: '/packing', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      disabled: false
    },
    { 
      name: 'Consign',
      path: '/consignment',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      disabled: false
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      disabled: false
    },
  ];

  const handleProfileClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const isDisabled = item.disabled;

            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className="flex flex-col items-center justify-center flex-1 py-2 cursor-not-allowed opacity-40"
                >
                  <div className="text-gray-400">
                    {item.icon}
                  </div>
                  <span className="text-xs mt-1 text-gray-400 font-medium">
                    {item.name}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                  isActive
                    ? 'text-teal-600'
                    : 'text-gray-600 hover:text-teal-500'
                }`}
              >
                <div className={isActive ? 'scale-110' : ''}>
                  {item.icon}
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-teal-600' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Profile Button */}
          <button
            onClick={handleProfileClick}
            className="flex flex-col items-center justify-center flex-1 py-2 text-gray-600 hover:text-teal-500 transition-colors"
          >
            <div className="relative">
              <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                user?.role === 'admin' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
            </div>
            <span className="text-xs mt-1 font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowLogoutModal(false)}
          />
          
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">{user?.name}</h3>
              <p className="text-sm text-gray-500 capitalize mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {user?.role}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                @{user?.username}
              </p>
            </div>

            <div className="h-px bg-gray-200 mb-4" />

            <p className="text-center text-gray-700 mb-6">
              Do you want to logout?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
