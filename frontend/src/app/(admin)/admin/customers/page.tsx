import { getCustomersAction, getCustomerStatsAction } from '@/lib/api/customers/customers.actions';
import AdminCustomersClient from './AdminCustomersClient';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  // Fetch data server-side
  const [customersResponse, statsResponse] = await Promise.all([
    getCustomersAction(),
    getCustomerStatsAction()
  ]);

  return (
    <AdminCustomersClient
      initialCustomers={customersResponse.data?.customers || []}
      stats={statsResponse.data}
    />
  );
}
