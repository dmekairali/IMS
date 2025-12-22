// app/page.jsx
import PendingOrdersList from '@/components/orders/PendingOrdersList';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/common/Toast';

export default function Home() {
  return (
    <main>
      <Header />
      <PendingOrdersList />
      <ToastContainer />
    </main>
  );
}
