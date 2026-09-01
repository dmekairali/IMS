// app/page.jsx - Redirect to Stock as default
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/live-stock');
}
