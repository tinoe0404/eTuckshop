import { getOrderByIdAction } from '@/lib/api/orders/orders.actions';
import OrderDetailClient from './OrderDetailClient';
import { notFound } from 'next/navigation';

// Disable static optimization for this page as it depends on dynamic data
export const dynamic = 'force-dynamic';

interface OrderDetailPageProps {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const orderId = parseInt(params.id);

  if (isNaN(orderId)) {
    notFound();
  }

  // Fetch order data server-side
  const response = await getOrderByIdAction(orderId);
  const order = response.data;

  // If order not found, show 404
  if (!order) {
    notFound();
  }

  // Pass initial data to client component
  return <OrderDetailClient order={order} />;
}