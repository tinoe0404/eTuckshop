'use client';

import { ShoppingCart, Bell, User } from 'lucide-react';
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
import { useCartStore } from '@/lib/store/cartStore';
import { useRouter } from 'next/navigation';
import { useLogout } from '@/lib/hooks/useAuth';

export default function CustomerHeader() {
  const router = useRouter();
  const { totalItems } = useCartStore();

  const { data: session } = useSession();
  const user = session?.user;

  const logoutMutation = useLogout();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-[#1a2332] border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">eT</span>
            </div>
            <span className="text-xl font-bold text-white">
              eTuckshop
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => router.push('/cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-blue-600">
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-700">
              <Bell className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden md:block font-medium">
                    {user?.name || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders')}>
                  Orders
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </div>
    </header>
  );
}
