import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export const metadata = {
  title: 'Inventory Management - Kairali',
  description: 'Ayurvedic Medicine Inventory Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
