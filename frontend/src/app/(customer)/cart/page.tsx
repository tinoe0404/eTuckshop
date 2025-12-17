// File: src/app/cart/page.tsx (Mobile Responsive - Works with Layout)
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

  const { data: cartData, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
    retry: 2,
  });

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

  if (error) {
    return (
      <div className="w-full h-full p-3 overflow-auto">
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Failed to load cart</h2>
                <p className="text-sm text-gray-400">Please try again</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/products')}
                  className="border-gray-700"
                >
                  Browse Products
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-3 overflow-auto">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32 bg-gray-800" />
          {[1, 2].map((i) => (
            <Card key={i} className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-gray-800" />
                    <Skeleton className="h-3 w-1/2 bg-gray-800" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasStockIssues = items.some((item: CartItem) => item.quantity > item.stock);

  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-3 pb-24 sm:p-4 sm:pb-4">
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/products')}
            className="gap-1 text-gray-300 hover:bg-gray-800 mb-2 px-2 h-8"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="text-xs">Back</span>
          </Button>
          
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Shopping Cart</h1>
              <p className="text-xs text-gray-400">{totalItems} items</p>
            </div>
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20 h-8 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white w-[90vw] max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">Clear cart?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-gray-400">
                      This will remove all items. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <AlertDialogCancel className="border-gray-700 mt-0">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCart} className="bg-red-600 hover:bg-red-700">
                      Clear Cart
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                <ShoppingCart className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Your cart is empty</h2>
                <p className="text-sm text-gray-400">Start shopping to add items</p>
              </div>
              <Button onClick={() => router.push('/products')} className="bg-blue-600 hover:bg-blue-700">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {hasStockIssues && (
              <Card className="bg-red-900/20 border-red-800">
                <CardContent className="p-2.5">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">Some items exceed stock. Adjust quantities.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {items.map((item: CartItem) => {
              const hasIssue = item.quantity > item.stock;
              const displayQuantity = quantityInputs[item.productId] ?? item.quantity.toString();

              return (
                <Card key={item.id} className={`bg-[#1a2332] ${hasIssue ? 'border-red-800 border-2' : 'border-gray-800'}`}>
                  <CardContent className="p-3">
                    <div className="flex gap-2.5 mb-2.5">
                      <div className="relative w-16 h-16 bg-gray-800 rounded overflow-hidden shrink-0">
                        {item.product?.image ? (
                          <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{item.product?.name}</h3>
                        <p className="text-xs text-gray-400 truncate">{item.product?.category?.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge className={`${getStockLevelColor(item.stockLevel)} text-xs px-1.5 py-0 h-4`}>
                            {item.stockLevel}
                          </Badge>
                          <span className="text-xs text-gray-500">{item.stock} left</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-400">Price</p>
                        <p className="text-sm font-bold text-white whitespace-nowrap">{formatCurrency(item.price)}</p>
                      </div>
                    </div>

                    {hasIssue && (
                      <div className="flex gap-1.5 p-2 bg-red-900/20 border border-red-800/30 rounded mb-2.5">
                        <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">Only {item.stock} available</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1, item.stock)}
                          disabled={item.quantity <= 1 || updateMutation.isPending}
                          className="h-7 w-7 border-gray-700"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="text"
                          value={displayQuantity}
                          onChange={(e) => handleQuantityInputChange(item.productId, e.target.value)}
                          onBlur={() => handleQuantityInputBlur(item.productId, item.stock)}
                          className="w-11 h-7 text-center bg-[#0f1419] border-gray-700 text-white text-sm px-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1, item.stock)}
                          disabled={item.quantity >= item.stock || updateMutation.isPending}
                          className="h-7 w-7 border-gray-700"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="text-sm font-bold text-blue-400 whitespace-nowrap">{formatCurrency(item.subtotal)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.productId)}
                          disabled={removeMutation.isPending}
                          className="h-7 w-7 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="bg-[#1a2332] border-gray-800 sticky bottom-0">
              <CardHeader className="border-b border-gray-800 p-3">
                <CardTitle className="text-base text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Tax</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Delivery</span>
                    <span className="font-semibold text-green-400">FREE</span>
                  </div>
                  <Separator className="bg-gray-700" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">Total</span>
                    <span className="font-bold text-blue-400 text-lg">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {hasStockIssues && (
                  <div className="flex gap-1.5 p-2 bg-yellow-900/20 border border-yellow-800/30 rounded">
                    <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">Resolve stock issues first</p>
                  </div>
                )}

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-sm"
                  onClick={handleCheckout}
                  disabled={hasStockIssues || items.length === 0}
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-gray-700 h-9 text-sm"
                  onClick={() => router.push('/products')}
                >
                  <ShoppingBag className="w-3 h-3 mr-2" />
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}