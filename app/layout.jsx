import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export const metadata = {
  title: 'Inventory Management - Kairali',
  description: 'Ayurvedic Medicine Inventory Management System',
  icons: {
    icon: 'https://cdn-icons-png.flaticon.com/512/1995/1995488.png',
    shortcut: 'https://cdn-icons-png.flaticon.com/512/1995/1995488.png',
    apple: 'https://cdn-icons-png.flaticon.com/512/1995/1995488.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/1995/1995488.png" />
      </head>
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
