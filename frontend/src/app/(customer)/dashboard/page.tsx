'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { productService } from '@/lib/api/services/product.service';
import { cartService } from '@/lib/api/services/cart.service';
import { orderService } from '@/lib/api/services/order.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  TrendingUp,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Plus,
  Eye,
  Star,
  Clock,
  CheckCircle,
  DollarSign,
  Zap,
  Heart,
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { Product, Order } from '@/types';
import Image from 'next/image';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTotalItems } = useCartStore();

  // Fetch cart summary
  const { data: cartData } = useQuery({
    queryKey: ['cart-summary'],
    queryFn: cartService.getCartSummary,
  });

  // Fetch recent orders
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders'],
    queryFn: orderService.getUserOrders,
  });

  // Fetch featured products (top 6)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-featured'],
    queryFn: productService.getAll,
  });

  // Update cart items count
  useEffect(() => {
    if (cartData?.data) {
      setTotalItems(cartData.data.totalItems);
    }
  }, [cartData, setTotalItems]);

  const featuredProducts = productsData?.data?.slice(0, 6) || [];
  const recentOrders = ordersData?.data?.slice(0, 3) || [];

  const stats = {
    cartItems: cartData?.data?.totalItems || 0,
    cartAmount: cartData?.data?.totalAmount || 0,
    pendingOrders:
      ordersData?.data?.filter((o: Order) => o.status === 'PENDING').length || 0,
    completedOrders:
      ordersData?.data?.filter((o: Order) => o.status === 'COMPLETED').length || 0,
    totalSpent:
      ordersData?.data
        ?.filter((o: Order) => o.status === 'COMPLETED')
        .reduce((sum: number, o: Order) => sum + o.totalAmount, 0) || 0,
  };

  const handleAddToCart = async (productId: number) => {
    try {
      const response = await cartService.addToCart({ productId, quantity: 1 });
      if (response.success) {
        toast.success('Added to cart!');
        setTotalItems(response.data.totalItems);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleWhatsAppShop = () => {
    const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+1234567890';
    const message = encodeURIComponent(
      `Hi! I would like to browse products on eTuckshop. My name is ${user?.name}.`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-blue-500 to-purple-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Welcome Back
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                Hey, {user?.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Ready to discover amazing products today?
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/products')}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Browse Products
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWhatsAppShop}
                  className="border-2 border-white text-white hover:bg-white/10 font-semibold"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Shop via WhatsApp
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-48 h-48 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
                <ShoppingBag className="w-24 h-24 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-linear-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-100 text-sm font-medium">Cart Items</p>
                  <p className="text-4xl font-bold">{stats.cartItems}</p>
                  <p className="text-blue-100 text-xs">
                    {formatCurrency(stats.cartAmount)} total
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-linear-to-br from-yellow-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-yellow-100 text-sm font-medium">Pending</p>
                  <p className="text-4xl font-bold">{stats.pendingOrders}</p>
                  <p className="text-yellow-100 text-xs">Orders awaiting</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-linear-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-4xl font-bold">{stats.completedOrders}</p>
                  <p className="text-green-100 text-xs">Orders delivered</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-linear-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-100 text-sm font-medium">Total Spent</p>
                  <p className="text-4xl font-bold">
                    {formatCurrency(stats.totalSpent).replace('$', '')}
                  </p>
                  <p className="text-purple-100 text-xs">All time spending</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Products */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Featured Products</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Handpicked just for you
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push('/products')}
                className="group"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProducts.map((product: Product) => (
                  <Card
                    key={product.id}
                    className="group overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative h-48 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-20 h-20 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 space-y-2">
                        <Badge
                          className={`${getStockLevelColor(product.stockLevel)} border-0 shadow-lg`}
                        >
                          {product.stockLevel}
                        </Badge>
                      </div>
                      <button className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-50">
                        <Heart className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {product.category.name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(product.price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.stock} in stock
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stock === 0}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to Cart
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/products/${product.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Recent Orders</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Your latest purchases
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/orders')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No orders yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start shopping to see your orders here
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push('/products')}
                  >
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order: Order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            order.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-600'
                              : order.status === 'PAID'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}
                        >
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
                        <Badge
                          variant={
                            order.status === 'COMPLETED'
                              ? 'default'
                              : order.status === 'PAID'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Quick Actions</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Navigate faster
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2"
                  onClick={() => router.push('/products')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Browse Products</p>
                      <p className="text-xs text-gray-500">
                        Explore our catalog
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-auto p-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-2"
                  onClick={() => router.push('/cart')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">View Cart</p>
                      <p className="text-xs text-gray-500">
                        {stats.cartItems} items
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between h-auto p-4 hover:bg-green-50 dark:hover:bg-green-900/20 border-2"
                  onClick={() => router.push('/orders')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">My Orders</p>
                      <p className="text-xs text-gray-500">
                        Track your orders
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  className="w-full justify-between h-auto p-4 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                  onClick={handleWhatsAppShop}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Shop via WhatsApp</p>
                      <p className="text-xs text-green-100">
                        Chat with us directly
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}