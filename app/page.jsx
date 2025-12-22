// app/page.jsx
import PendingOrdersList from '@/components/orders/PendingOrdersList';
import ToastContainer from '@/components/common/Toast';

export default function Home() {
  return (
    <main>
      <PendingOrdersList />
      <ToastContainer />
    </main>
  );
}
