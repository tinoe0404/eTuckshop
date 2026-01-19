import { getDashboardStatsAction } from '@/lib/api/analytics/analytics.actions';
import { getAdminOrdersAction, getOrderStatsAction } from '@/lib/api/orders/orders.actions';
import { getAdminProductsAction } from '@/lib/api/products/products.actions';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Parallel data fetching
  const [statsResult, ordersResult, orderStatsResult, productsResult] = await Promise.all([
    getDashboardStatsAction(),
    getAdminOrdersAction({ page: 1, limit: 5 }),
    getOrderStatsAction(),
    getAdminProductsAction(),
  ]);

  return (
    <AdminDashboardClient
      stats={statsResult.data}
      recentOrders={ordersResult.data?.orders || []}
      orderStats={orderStatsResult.data}
      products={productsResult.data || []}
    />
  );
}
