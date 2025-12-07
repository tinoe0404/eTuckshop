'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { orderService } from '@/lib/api/services/order.service';
import { productService } from '@/lib/api/services/product.service';
import { toast } from 'sonner';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BarChart3,
  QrCode,
  ChevronRight,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // ============================================
  // AUTH PROTECTION
  // ============================================
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      toast.error('Access denied. Admin only.');
      router.push('/');
    }
  }, [user, router]);

  // ============================================
  // MULTIPLE GRANULAR QUERIES (like customer dashboard)
  // ============================================
  
  // 1. Dashboard Stats Query
  const {
    data: statsResponse,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorData,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data stale after 10s
    retry: 2,
    enabled: !!user && user.role === 'ADMIN', // Only fetch if admin
  });

  // 2. Recent Orders Query (separate from stats)
  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderService.getAllOrders({ page: 1, limit: 5 }),
    refetchInterval: 20000, // Refresh more frequently
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!user && user.role === 'ADMIN',
  });

  // 3. Order Stats Query (for real-time order metrics)
  const {
    data: orderStatsResponse,
    isLoading: orderStatsLoading,
    refetch: refetchOrderStats,
  } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: orderService.getOrderStats,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!user && user.role === 'ADMIN',
  });

  // 4. Low Stock Products Query
  const {
    data: productsResponse,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products-summary'],
    queryFn: productService.getAll,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
    enabled: !!user && user.role === 'ADMIN',
  });

  // ============================================
  // MUTATIONS (for quick actions)
  // ============================================

  // Complete Order Mutation
  const completeOrderMutation = useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    onSuccess: async () => {
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
      toast.success('Order completed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete order');
    },
  });

  // Reject Order Mutation
  const rejectOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      orderService.rejectOrder(orderId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
      toast.success('Order rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject order');
    },
  });

  // ============================================
  // DERIVED STATE
  // ============================================
  const stats = statsResponse?.data;
  const recentOrders = ordersResponse?.data?.orders || [];
  const orderStats = orderStatsResponse?.data;
  const lowStockProducts = productsResponse?.data?.filter(
    (p) => p.stockLevel === 'LOW'
  ) || [];

  // ============================================
  // MANUAL REFRESH ALL
  // ============================================
  const handleRefreshAll = async () => {
    toast.promise(
      Promise.all([
        refetchStats(),
        refetchOrders(),
        refetchOrderStats(),
        refetchProducts(),
      ]),
      {
        loading: 'Refreshing dashboard...',
        success: 'Dashboard refreshed!',
        error: 'Failed to refresh',
      }
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================
  const isLoading = statsLoading || ordersLoading || orderStatsLoading || productsLoading;

  if (!user || user.role !== 'ADMIN') {
    return null; // Auth protection
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (statsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>
              {(statsErrorData as any)?.response?.data?.message || 'Failed to load dashboard data'}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => refetchStats()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => router.push('/')} variant="ghost">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Admin Dashboard
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Here's your store overview and performance metrics
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/admin/scan-qr')}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Scan QR Code
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/admin/analytics')}
                  className="border-2 border-white text-white hover:bg-white/10 font-semibold"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Analytics
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleRefreshAll}
                  className="border-2 border-white text-white hover:bg-white/10 font-semibold"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-48 h-48 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
                <Package className="w-24 h-24 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold">
                    ${stats?.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                  <div className="flex items-center space-x-1 text-green-100 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span>All time revenue</span>
                  </div>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-100 text-sm font-medium">Today's Revenue</p>
                  <p className="text-4xl font-bold">
                    ${stats?.todayRevenue?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-blue-100 text-xs">
                    From {orderStats?.orders.completed || 0} orders
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-100 text-sm font-medium">Total Orders</p>
                  <p className="text-4xl font-bold">{orderStats?.orders.total || 0}</p>
                  <p className="text-purple-100 text-xs">
                    {orderStats?.orders.pending || 0} pending
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Customers */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-orange-100 text-sm font-medium">Total Customers</p>
                  <p className="text-4xl font-bold">{stats?.totalCustomers || 0}</p>
                  <p className="text-orange-100 text-xs">Registered users</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Section (NEW - separate query) */}
        {!ordersError && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Recent Orders</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Latest customer orders
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchOrders()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/admin/orders')}
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent orders
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                          order.status === 'PAID' ? 'bg-blue-100 text-blue-600' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {order.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" /> :
                           order.status === 'CANCELLED' ? <XCircle className="w-5 h-5" /> :
                           <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{order.user?.name}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
                        <div className="flex gap-2">
                          {order.status === 'PAID' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => completeOrderMutation.mutate(order.id)}
                                disabled={completeOrderMutation.isPending}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectOrderMutation.mutate({ orderId: order.id })}
                                disabled={rejectOrderMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Full Width */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Quick Actions</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your store efficiently
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="w-full justify-between h-auto p-6 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-2 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all duration-300 group"
                onClick={() => router.push('/admin/orders?status=PENDING')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Pending Orders</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {orderStats?.orders.pending || 0} orders waiting
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all duration-300" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-6 hover:bg-red-50 dark:hover:bg-red-900/20 border-2 hover:border-red-300 dark:hover:border-red-700 transition-all duration-300 group"
                onClick={() => router.push('/admin/inventory')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <AlertCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Low Stock Alert</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lowStockProducts.length} products need restocking
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all duration-300" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-6 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group"
                onClick={() => router.push('/admin/products')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Manage Products</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stats?.totalProducts || 0} products in catalog
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
              </Button>

              <Button
                className="w-full justify-between h-auto p-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group md:col-span-2 lg:col-span-1"
                onClick={() => router.push('/admin/scan-qr')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <QrCode className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Scan QR Code</p>
                    <p className="text-sm text-green-100">
                      Process customer payments
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-all duration-300" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-6 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 group md:col-span-2 lg:col-span-1"
                onClick={() => router.push('/admin/analytics')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">View Analytics</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Detailed insights & reports
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-6 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-2 hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 group md:col-span-2 lg:col-span-1"
                onClick={() => router.push('/admin/orders')}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">All Orders</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {orderStats?.orders.total || 0} total orders
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all duration-300" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}