import './globals.css';
import BottomNav from '@/components/layout/BottomNav';

export const metadata = {
  title: 'Inventory Management - Kairali',
  description: 'Ayurvedic Medicine Inventory Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <main className="min-h-screen pb-16">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
