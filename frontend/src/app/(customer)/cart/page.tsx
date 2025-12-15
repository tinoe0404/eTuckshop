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
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-16 h-16 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Failed to load cart
                  </h2>
                  <p className="text-gray-400">
                    There was an error loading your cart. Please try again.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Try Again
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/products')}
                    className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
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
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-[#1a2332] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-24 h-24 rounded-lg bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4 bg-gray-800" />
                        <Skeleton className="h-4 w-1/2 bg-gray-800" />
                        <Skeleton className="h-10 w-32 bg-gray-800" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Card className="bg-[#1a2332] border-gray-800">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-8 w-full bg-gray-800" />
                  <Skeleton className="h-8 w-full bg-gray-800" />
                  <Skeleton className="h-12 w-full bg-gray-800" />
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
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/products')}
              className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white">
                Shopping Cart
              </h1>
              <p className="text-gray-400 mt-1">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-400 hover:text-red-300 border-gray-700 hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will remove all items from your cart. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
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
          <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-16 h-16 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Your cart is empty
                  </h2>
                  <p className="text-gray-400">
                    Looks like you haven't added any items yet. Start shopping!
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => router.push('/products')}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Browse Products
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Cart with Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stock Issues Alert */}
              {hasStockIssues && (
                <Card className="bg-red-900/20 border-red-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-400">Stock Issues</h4>
                        <p className="text-sm text-red-300">
                          Some items in your cart exceed available stock. Please adjust quantities.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items List */}
              {items.map((item: CartItem) => {
                const hasIssue = item.quantity > item.stock;
                const displayQuantity = quantityInputs[item.productId] ?? item.quantity.toString();

                return (
                  <Card 
                    key={item.id} 
                    className={`bg-[#1a2332] border-gray-800 transition-all ${
                      hasIssue ? 'border-red-800 border-2' : ''
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Product Image */}
                        <div className="relative w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shrink-0">
                          {item.product?.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-gray-600" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {item.product?.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {item.product?.category?.name}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getStockLevelColor(item.stockLevel)}>
                                {item.stockLevel}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {item.stock} available
                              </span>
                            </div>
                          </div>

                          {hasIssue && (
                            <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-red-300">
                                Only {item.stock} available. Please reduce quantity.
                              </p>
                            </div>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(item.productId, item.quantity - 1, item.stock)}
                                disabled={item.quantity <= 1 || updateMutation.isPending}
                                className="h-8 w-8 border-gray-700 text-gray-300 hover:bg-gray-800"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Input
                                type="text"
                                value={displayQuantity}
                                onChange={(e) => handleQuantityInputChange(item.productId, e.target.value)}
                                onBlur={() => handleQuantityInputBlur(item.productId, item.stock)}
                                className="w-16 h-8 text-center bg-[#0f1419] border-gray-700 text-white"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1, item.stock)}
                                disabled={item.quantity >= item.stock || updateMutation.isPending}
                                className="h-8 w-8 border-gray-700 text-gray-300 hover:bg-gray-800"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.productId)}
                              disabled={removeMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-sm text-gray-400">Unit Price</p>
                            <p className="text-lg font-semibold text-white">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Subtotal</p>
                            <p className="text-xl font-bold text-blue-400">
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="bg-[#1a2332] border-gray-800 shadow-xl sticky top-20">
                <CardHeader className="border-b border-gray-800">
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Subtotal ({totalItems} items)</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Tax</span>
                      <span className="font-semibold">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Delivery</span>
                      <span className="font-semibold text-green-400">FREE</span>
                    </div>
                    <Separator className="bg-gray-700" />
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-bold text-white">Total</span>
                      <span className="font-bold text-blue-400 text-2xl">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleCheckout}
                    disabled={hasStockIssues || items.length === 0}
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  {hasStockIssues && (
                    <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-yellow-300">
                        Please resolve stock issues before proceeding
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => router.push('/products')}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}