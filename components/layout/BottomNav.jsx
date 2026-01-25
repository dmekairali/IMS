// components/layout/BottomNav.jsx - Updated with permission-based visibility
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  // Define all navigation items with permission requirements
  const allNavItems = [
    { 
      name: 'Stock', 
      path: '/live-stock', 
      permission: 'liveStock',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    { 
      name: 'Orders', 
      path: '/orders', 
      permission: 'dispatch',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    { 
      name: 'Packing', 
      path: '/packing', 
      permission: 'packing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    { 
      name: 'Consign',
      path: '/consignment',
      permission: 'consignment',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      permission: 'reports',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  // Filter nav items based on user permissions (at least View access)
  const navItems = allNavItems.filter(item => hasPermission(item.permission, 'View'));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path}
                href={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full"
              >
                <div className={`p-2 rounded-lg transition-all ${
                  isActive 
                    ? 'text-teal-600' 
                    : 'text-gray-500 active:bg-gray-100'
                }`}>
                  {item.icon}
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-teal-600' : 'text-gray-500'
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          {/* Profile Button */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className="relative">
              <div className={`p-2 rounded-lg transition-all text-gray-500 active:bg-gray-100`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {/* Role badge */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                user?.role === 'Director' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
            </div>
            <span className="text-xs mt-1 font-medium text-gray-500">Profile</span>
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
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">{user?.name}</h3>
              <p className="text-sm text-gray-500 capitalize mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'Director' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {user?.role}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                ID: {user?.employeeId}
              </p>
              
              {/* Show permissions summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                <p className="text-xs font-semibold text-gray-700 mb-2">Access Permissions:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {user?.permissions && Object.entries(user.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        value === 'Admin' ? 'bg-purple-500' :
                        value === 'Edit' ? 'bg-blue-500' :
                        value === 'View' ? 'bg-green-500' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-gray-600 capitalize">{key}: {value}</span>
                    </div>
                  ))}
                </div>
              </div>
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
