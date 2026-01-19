'use client';

import { useState } from 'react';
import { Bell, User, Menu, LogOut, LayoutDashboard, ShoppingBag, Package, BarChart3, QrCode, Users, FolderOpen, Box, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLogout } from '@/lib/api/auth/auth.hooks';

export default function AdminHeader() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 
  const { data: session } = useSession();
  const user = session?.user;

  const logoutMutation = useLogout();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const mobileNavItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/dashboard');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/analytics');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Products',
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/products');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Categories',
      icon: <FolderOpen className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/categories');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Orders',
      icon: <Package className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/orders');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Inventory',
      icon: <Box className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/inventory');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Scan QR',
      icon: <QrCode className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/scan-qr');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Customers',
      icon: <Users className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/customers');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Profile',
      icon: <UserCircle className="w-5 h-5" />,
      onClick: () => {
        router.push('/admin/profile');
        setMobileMenuOpen(false);
      },
    },
  ];

  return (
    <header className="bg-[#1a2332] border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Mobile Menu Button - Only visible on mobile */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#1a2332] border-gray-800 w-80">
                <SheetHeader className="border-b border-gray-800 pb-4">
                  <SheetTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl font-bold">eT</span>
                    </div>
                    <div>
                      <span className="text-xl font-bold text-white">eTuckshop</span>
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                        Admin
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Navigation */}
                <nav className="mt-6 space-y-2">
                  {mobileNavItems.map((item, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 h-12"
                      onClick={item.onClick}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  ))}
                  
                  <div className="pt-4 border-t border-gray-800 mt-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 h-12"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      <span className="flex-1 text-left">Logout</span>
                    </Button>
                  </div>
                </nav>

                {/* User Info */}
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{user?.name || 'Admin'}</p>
                      <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo - Centered on mobile, left-aligned on desktop */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">eT</span>
              </div>
              <div className="hidden lg:block">
                <span className="text-xl font-bold text-white">eTuckshop</span>
                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  Admin
                </span>
              </div>
            </div>
          </div>

          {/* Desktop-only Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            
            {/* Notifications - Desktop only */}
            <div className="hidden lg:block">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <Bell className="w-5 h-5" />
              </Button>
            </div>

            {/* Admin Menu - Desktop only */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <span className="font-medium">
                      {user?.name || 'Admin'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#1a2332] border-gray-700">
                  <DropdownMenuLabel className="text-gray-300">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    onClick={() => router.push('/admin/profile')}
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => router.push('/admin/settings')}
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                  >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
