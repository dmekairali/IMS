import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export const metadata = {
  title: 'Inventory Management - Kairali',
  description: 'Ayurvedic Medicine Inventory Management System',
  icons: {
    icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913133.png',
    shortcut: 'https://cdn-icons-png.flaticon.com/512/2913/2913133.png',
    apple: 'https://cdn-icons-png.flaticon.com/512/2913/2913133.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/2913/2913133.png" />
      </head>
      <body className="bg-gray-50">
        <AuthProvider>
          <DataProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
