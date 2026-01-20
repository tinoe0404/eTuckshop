'use client';

import { useState } from 'react';
import {
  ShoppingCart,
  Bell,
  User,
  Menu,
  ShoppingBag,
  Package,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
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
import { useRouter } from 'next/navigation';
import { useLogout } from '@/lib/api/auth/auth.hooks';

interface CustomerHeaderProps {
  cartItemCount?: number;
}

export default function CustomerHeader({ cartItemCount = 0 }: CustomerHeaderProps) {
  const router = useRouter();
  // const totalItems = useCartCount(); // Removed hook usage
  const totalItems = cartItemCount;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: session } = useSession();
  const user = session?.user;

  const logoutMutation = useLogout();

  const handleLogout = () => logoutMutation.mutate();

  const mobileNavItems = [
    {
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      onClick: () => {
        router.push('/dashboard');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Products',
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => {
        router.push('/products');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Cart',
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: totalItems,
      onClick: () => {
        router.push('/cart');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Orders',
      icon: <Package className="w-5 h-5" />,
      onClick: () => {
        router.push('/orders');
        setMobileMenuOpen(false);
      },
    },
    {
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      onClick: () => {
        router.push('/profile');
        setMobileMenuOpen(false);
      },
    },
  ];

  return (
    <header className="bg-[#1a2332] border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-700">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="bg-[#1a2332] border-gray-800 w-80">
                <SheetHeader className="border-b border-gray-800 pb-4">
                  <SheetTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                      eT
                    </div>
                    <span className="text-xl font-bold text-white">eTuckshop</span>
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-6 space-y-2">
                  {mobileNavItems.map((item, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 h-12"
                      onClick={item.onClick}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge! > 0 && <Badge className="bg-blue-600">{item.badge}</Badge>}
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
                      Logout
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <div className="flex-1 flex justify-center lg:justify-start cursor-pointer" onClick={() => router.push('/dashboard')}>
            <span className="text-xl font-bold text-white">eTuckshop</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => router.push('/cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-blue-600">
                  {totalItems}
                </Badge>
              )}
            </Button>

            <div className="hidden lg:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span>{user?.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 bg-[#1a2332] border-gray-700">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/orders')}>
                    <Package className="w-4 h-4 mr-2" /> Orders
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
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

