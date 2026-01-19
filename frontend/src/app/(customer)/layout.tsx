import CustomerHeader from '@/components/layout/CustomerHeader';
import CustomerSidebar from '@/components/layout/CustomerSidebar';
import StockUpdater from '@/components/common/StockUpdater';

import { getCartSummaryAction } from '@/lib/api/cart/cart.actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cartSummary = await getCartSummaryAction();
  const cartCount = cartSummary.data?.totalItems || 0;

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <StockUpdater />
      {/* Header - Always visible */}
      <CustomerHeader cartItemCount={cartCount} />

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar - Hidden on mobile (< 1024px), visible on desktop (≥ 1024px) */}
        <div className="hidden lg:block">
          <CustomerSidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}