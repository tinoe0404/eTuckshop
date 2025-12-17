import AdminHeader from '@/components/layout/AdminHeader';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header - Always visible */}
      <AdminHeader />
      
      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar - Hidden on mobile (< 1024px), visible on desktop (≥ 1024px) */}
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}