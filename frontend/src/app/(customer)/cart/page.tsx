'use client';

import { useEffect } from 'react';
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
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { CartItem } from '@/lib/types';
import Image from 'next/image';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTotalItems } = useCartStore();

  // Fetch cart
  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
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

  // Update cart store
  useEffect(() => {
    if (cart) {
      setTotalItems(cart.totalItems);
    }
  }, [cart, setTotalItems]);

  const handleQuantityChange = (productId: number, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxStock) {
      toast.error(`Only ${maxStock} available in stock`);
      return;
    }
    updateMutation.mutate({ productId, quantity: newQuantity });
  };

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
    router.push('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
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
                <div className="w-32 h-32 bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto">
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
          // Cart with Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                  <CardTitle className="flex items-center justify-between">
                    <span>Cart Items</span>
                    <Badge variant="secondary">{totalItems} items</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {items.map((item: CartItem) => (
                    <Card
                      key={item.id}
                      className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Product Image */}
                          <div className="relative w-24 h-24 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-10 h-10 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3
                                  className="font-semibold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => router.push(`/products/${item.productId}`)}
                                >
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.category.name}
                                </p>
                              </div>
                              <Badge
                                className={`${getStockLevelColor(item.stockLevel)} border-0`}
                              >
                                {item.stock} in stock
                              </Badge>
                            </div>

                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2">
                              {/* Quantity Controls */}
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      item.quantity - 1,
                                      item.stock
                                    )
                                  }
                                  disabled={item.quantity <= 1 || updateMutation.isPending}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.stock}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                      handleQuantityChange(item.productId, value, item.stock);
                                    }
                                  }}
                                  className="w-16 h-8 text-center"
                                  disabled={updateMutation.isPending}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      item.quantity + 1,
                                      item.stock
                                    )
                                  }
                                  disabled={
                                    item.quantity >= item.stock || updateMutation.isPending
                                  }
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Price & Remove */}
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-blue-600">
                                    {formatCurrency(item.subtotal)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatCurrency(item.price)} each
                                  </p>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove item?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove "{item.name}" from your cart?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveItem(item.productId)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            {/* Stock Warning */}
                            {item.quantity > item.stock && (
                              <div className="flex items-center space-x-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                  Only {item.stock} available. Please update quantity.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-xl sticky top-20">
                <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Summary Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Subtotal ({totalItems} items)</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Tax</span>
                      <span className="font-semibold">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Delivery</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between text-lg">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-blue-600 text-2xl">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleCheckout}
                    disabled={items.some((item) => item.quantity > item.stock)}
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </Button>

                  {/* Additional Info */}
                  <div className="pt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-start space-x-2">
                      <ShoppingBag className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Free pickup at counter</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Package className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Show QR code for quick collection</span>
                    </div>
                  </div>

                  {/* Continue Shopping */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/products')}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
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