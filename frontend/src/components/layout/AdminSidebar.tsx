'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  Package,
  ScanLine,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Products',
        href: '/admin/products',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        title: 'Categories',
        href: '/admin/categories',
        icon: <FolderTree className="w-5 h-5" />,
      },
      {
        title: 'Orders',
        href: '/admin/orders',
        icon: <Package className="w-5 h-5" />,
      },
      {
        title: 'Inventory',
        href: '/admin/inventory',
        icon: <BarChart3 className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        title: 'Scan QR',
        href: '/admin/scan-qr',
        icon: <ScanLine className="w-5 h-5" />,
      },
      {
        title: 'Customers',
        href: '/admin/customers',
        icon: <Users className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: <Settings className="w-5 h-5" />,
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)]',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Collapse Button */}
        <div className="p-4 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-6">
            {navGroups.map((group, index) => (
              <div key={group.title}>
                {!isCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            'flex items-center justify-between px-3 py-3 rounded-lg transition-colors',
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={cn(
                                isActive && 'text-blue-600 dark:text-blue-400'
                              )}
                            >
                              {item.icon}
                            </span>
                            {!isCollapsed && (
                              <span className="font-medium">{item.title}</span>
                            )}
                          </div>
                          {!isCollapsed && item.badge && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {index < navGroups.length - 1 && !isCollapsed && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Admin Panel
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                TuckMate v1.0.0
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}