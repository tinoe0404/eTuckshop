import CustomerHeader from '@/components/layout/CustomerHeader';
import CustomerSidebar from '@/components/layout/CustomerSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header - Always visible */}
      <CustomerHeader />
      
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