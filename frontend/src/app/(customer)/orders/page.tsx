import { getUserOrdersAction } from '@/lib/api/orders/orders.actions';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const response = await getUserOrdersAction();
  const orders = response.data?.orders || [];

  return <OrdersClient orders={orders} />;
}
