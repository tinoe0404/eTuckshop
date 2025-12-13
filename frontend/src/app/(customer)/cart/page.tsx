// File: src/app/cart/page.tsx (FIXED - Remove auth check, middleware handles it)
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
import { useCartStore } from '@/lib/store/cartStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Package,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { CartItem } from '@/types';
import Image from 'next/image';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTotalItems } = useCartStore();
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({});

  // ✅ No auth check here - middleware handles it
  // Fetch cart
  const { data: cartData, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
    retry: 2,
  });

  // Update cart item mutation
  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartService.updateCartItem({ productId, quantity }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
      setTotalItems(response.data.totalItems);
      toast.success('Cart updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    },
  });

  // Remove item mutation
  const removeMutation = useMutation({
    mutationFn: (productId: number) => cartService.removeFromCart(productId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
      setTotalItems(response.data.totalItems);
      toast.success('Item removed from cart');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    },
  });

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationFn: cartService.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
      setTotalItems(0);
      toast.success('Cart cleared');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clear cart');
    },
  });

  const cart = cartData?.data;
  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const totalAmount = cart?.totalAmount || 0;

  const handleQuantityChange = useCallback((productId: number, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxStock) {
      toast.error(`Only ${maxStock} available in stock`);
      return;
    }
    updateMutation.mutate({ productId, quantity: newQuantity });
  }, [updateMutation]);

  const handleQuantityInputChange = useCallback((productId: number, value: string) => {
    setQuantityInputs(prev => ({ ...prev, [productId]: value }));
  }, []);

  const handleQuantityInputBlur = useCallback((productId: number, maxStock: number) => {
    const value = quantityInputs[productId];
    if (value) {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue > 0) {
        handleQuantityChange(productId, numValue, maxStock);
      }
    }
    setQuantityInputs(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  }, [quantityInputs, handleQuantityChange]);

  const handleRemoveItem = (productId: number) => {
    removeMutation.mutate(productId);
  };

  const handleClearCart = () => {
    clearMutation.mutate();
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    const stockIssues = items.filter((item: CartItem) => item.quantity > item.stock);
    if (stockIssues.length > 0) {
      toast.error('Please update quantities for out-of-stock items');
      return;
    }
    
    router.push('/checkout');
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Failed to load cart
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    There was an error loading your cart. Please try again.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
                    className="gap-2"
                  >
                    Try Again
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/products')}
                    className="gap-2"
                  >
                    Browse Products
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-24 h-24 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasStockIssues = items.some((item: CartItem) => item.quantity > item.stock);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/products')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Shopping Cart
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all items from your cart. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearCart}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear Cart
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {items.length === 0 ? (
          // Empty Cart State
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Your cart is empty
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Looks like you haven't added any items yet. Start shopping!
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => router.push('/products')}
                  className="gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Products
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Cart with Items (keep your existing cart items rendering code)
          <div className="text-center py-12">
            <p className="text-gray-500">Cart items rendering here...</p>
            <Button onClick={handleCheckout} className="mt-4">
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}