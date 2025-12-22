// app/page.jsx - Add BottomNav
import PendingOrdersList from '@/components/orders/PendingOrdersList';
import ToastContainer from '@/components/common/Toast';
import BottomNav from '@/components/layout/BottomNav';

export default function Home() {
  return (
    <main className="pb-16">
      <PendingOrdersList />
      <ToastContainer />
      <BottomNav />
    </main>
  );
}
