// components/layout/LayoutWrapper.jsx
'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from './BottomNav';
import LoadingSpinner from '../common/LoadingSpinner';
import OfflineIndicator from '../common/OfflineIndicator';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  const isLoginPage = pathname === '/login';
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!user && !isLoginPage && typeof window !== 'undefined') {
    window.location.href = '/login';
    return null;
  }
  
  return (
    <>
      {/* Offline Indicator - shows at top when offline */}
      {!isLoginPage && user && <OfflineIndicator />}
      
      {/* Main Content */}
      <main className={!isLoginPage && user ? "min-h-screen pb-16" : "min-h-screen"}>
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {!isLoginPage && user && <BottomNav />}
    </>
  );
}
