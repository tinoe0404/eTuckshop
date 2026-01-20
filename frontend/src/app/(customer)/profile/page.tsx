export const dynamic = 'force-dynamic';

import { getUserOrdersAction } from '@/lib/api/orders/orders.actions';
import CustomerProfileClient from './CustomerProfileClient';

export default async function CustomerProfilePage() {
  const ordersResponse = await getUserOrdersAction();
  return (
    <CustomerProfileClient
      initialOrders={ordersResponse.data?.orders || []}
    />
  );
}
