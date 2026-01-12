'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  QrCode,
  Users,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: 'Products',
    href: '/admin/products',
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: <Package className="w-5 h-5" />,
  },
  {
    title: 'Scan QR',
    href: '/admin/scan-qr',
    icon: <QrCode className="w-5 h-5" />,
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: 'Profile',
    href: '/admin/profile',
    icon: <UserCircle className="w-5 h-5" />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-[#1a2332] border-r border-gray-800 transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)]',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Collapse Button */}
        <div className="p-4 flex justify-end border-b border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white',
                      isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <span className={cn(isActive && 'text-white')}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="font-medium">{item.title}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              eTuckshop Admin v1.0.0
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}