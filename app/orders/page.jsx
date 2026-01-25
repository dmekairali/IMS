// app/orders/page.jsx - Orders list page
import PendingOrdersList from '@/components/orders/PendingOrdersList';
import ToastContainer from '@/components/common/Toast';

export default function OrdersPage() {
  return (
    <main className="pb-16">
      <PendingOrdersList />
      <ToastContainer />
    </main>
  );
}
