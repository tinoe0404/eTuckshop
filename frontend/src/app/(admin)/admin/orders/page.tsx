import { getAdminOrdersAction, getOrderStatsAction } from '@/lib/api/orders/orders.actions';
import AdminOrdersClient from './AdminOrdersClient';

// Ensure dynamic rendering so we always get fresh orders
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const limit = 10;

  // Parallel Fetching
  const [ordersResult, statsResult] = await Promise.all([
    getAdminOrdersAction({ page, limit }),
    getOrderStatsAction()
  ]);

  const ordersData = ordersResult.data;
  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const stats = statsResult.data;

  // We pass initial data to Client Component
  // Client component can handle client-side filtering or subsequent navigations
  return (
    <AdminOrdersClient
      initialOrders={orders}
      initialPagination={pagination}
      stats={stats}
    />
  );
}
