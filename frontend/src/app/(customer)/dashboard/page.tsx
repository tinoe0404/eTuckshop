import { getCartSummaryAction } from '@/lib/api/cart/cart.actions';
import { getUserOrdersAction } from '@/lib/api/orders/orders.actions';
import { getProductsAction } from '@/lib/api/products/products.actions';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

/**
 * Customer Dashboard - Server Component
 * Fetches all data server-side with parallel requests
 */
export default async function CustomerDashboard() {
  // Parallel data fetching for optimal performance
  const [cartResponse, ordersResponse, productsResponse] = await Promise.all([
    getCartSummaryAction(),
    getUserOrdersAction(),
    getProductsAction({ limit: 6, sort: 'desc' }),
  ]);

  return (
    <DashboardClient
      cartData={cartResponse.data}
      ordersData={ordersResponse.data?.orders || []}
      productsData={Array.from(productsResponse.data || [])}
    />
  );
}
