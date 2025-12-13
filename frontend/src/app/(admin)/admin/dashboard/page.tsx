// File: src/app/(admin)/admin/dashboard/page.tsx (FIXED)
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // ✅ Changed from useAuthStore
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { orderService } from '@/lib/api/services/order.service';
import { productService } from '@/lib/api/services/product.service';
import { toast } from 'sonner';
import {
  Package, ShoppingBag, Users, DollarSign, TrendingUp, Clock,
  CheckCircle, AlertCircle, Sparkles, BarChart3, QrCode, ChevronRight,
  RefreshCw, XCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession(); // ✅ Use NextAuth session

  // ✅ Guard: Redirect if not authenticated or not admin
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  if (session?.user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin only.');
    router.replace('/dashboard');
    return null;
  }

  const user = session.user; // ✅ Get user from session

  // QUERIES
  const {
    data: statsResponse, isLoading: statsLoading, isError: statsError,
    error: statsErrorData, refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 2,
  });

  const {
    data: ordersResponse, isLoading: ordersLoading, isError: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderService.getAllOrders({ page: 1, limit: 5 }),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const {
    data: orderStatsResponse, isLoading: orderStatsLoading,
    refetch: refetchOrderStats,
  } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: orderService.getOrderStats,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const {
    data: productsResponse, isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products-summary'],
    queryFn: productService.getAll,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // DERIVED DATA
  const stats = statsResponse?.data;
  const recentOrders = ordersResponse?.data?.orders || [];
  const orderStats = orderStatsResponse?.data;
  const lowStockProducts = productsResponse?.data?.filter(p => p.stockLevel === 'LOW') || [];

  // MUTATIONS (keeping your existing mutation logic)
  const completeOrderMutation = useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-recent-orders'] });
      await queryClient.cancelQueries({ queryKey: ['admin-order-stats'] });
      
      const previousOrders = queryClient.getQueryData(['admin-recent-orders']);
      const previousStats = queryClient.getQueryData(['admin-order-stats']);
      
      queryClient.setQueryData(['admin-recent-orders'], (old: any) => {
        if (!old?.data?.orders) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: old.data.orders.map((order: Order) =>
              order.id === orderId
                ? { ...order, status: 'COMPLETED', completedAt: new Date().toISOString() }
                : order
            ),
          },
        };
      });
      
      queryClient.setQueryData(['admin-order-stats'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: {
              ...old.data.orders,
              paid: Math.max(0, (old.data.orders.paid || 0) - 1),
              completed: (old.data.orders.completed || 0) + 1,
            },
          },
        };
      });
      
      toast.loading('Completing order...', { id: `complete-${orderId}` });
      
      return { previousOrders, previousStats, orderId };
    },

    onSuccess: async (data, variables, context) => {
      toast.success('Order completed successfully!', { id: `complete-${context.orderId}` });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
    },

    onError: (error: any, variables, context: any) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['admin-recent-orders'], context.previousOrders);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['admin-order-stats'], context.previousStats);
      }
      
      toast.error(error.response?.data?.message || 'Failed to complete order', {
        id: `complete-${context.orderId}`,
        description: 'Changes have been reverted',
      });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      orderService.rejectOrder(orderId, reason),
    
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-recent-orders'] });
      await queryClient.cancelQueries({ queryKey: ['admin-order-stats'] });
      
      const previousOrders = queryClient.getQueryData(['admin-recent-orders']);
      const previousStats = queryClient.getQueryData(['admin-order-stats']);
      
      queryClient.setQueryData(['admin-recent-orders'], (old: any) => {
        if (!old?.data?.orders) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: old.data.orders.map((order: Order) =>
              order.id === orderId
                ? { ...order, status: 'CANCELLED' }
                : order
            ),
          },
        };
      });
      
      queryClient.setQueryData(['admin-order-stats'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            orders: {
              ...old.data.orders,
              paid: Math.max(0, (old.data.orders.paid || 0) - 1),
              cancelled: (old.data.orders.cancelled || 0) + 1,
            },
          },
        };
      });
      
      toast.loading('Rejecting order...', { id: `reject-${orderId}` });
      
      return { previousOrders, previousStats, orderId };
    },

    onSuccess: async (data, variables, context) => {
      toast.success('Order rejected', { id: `reject-${context.orderId}` });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
    },

    onError: (error: any, variables, context: any) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['admin-recent-orders'], context.previousOrders);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['admin-order-stats'], context.previousStats);
      }
      
      toast.error(error.response?.data?.message || 'Failed to reject order', {
        id: `reject-${context.orderId}`,
        description: 'Changes have been reverted',
      });
    },
  });

  const handleRefreshAll = async () => {
    toast.promise(
      Promise.all([refetchStats(), refetchOrders(), refetchOrderStats(), refetchProducts()]),
      { loading: 'Refreshing dashboard...', success: 'Dashboard refreshed!', error: 'Failed to refresh' }
    );
  };

  const isLoading = statsLoading || ordersLoading || orderStatsLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 p-6">
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
              <RefreshCw className="w-4 h-4 mr-2" />Retry
            </Button>
            <Button onClick={() => router.push('/')} variant="ghost">Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <span className="text-sm font-semibold uppercase tracking-wider">Admin Dashboard</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">Welcome back, {user?.name}! 👋</h1>
              <p className="text-blue-100 text-lg">Here's your store overview and performance metrics</p>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button size="lg" onClick={() => router.push('/admin/scan-qr')}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg">
                  <QrCode className="w-5 h-5 mr-2" />Scan QR Code
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push('/admin/analytics')}
                  className="border-2 border-white text-white hover:bg-white/10 font-semibold">
                  <BarChart3 className="w-5 h-5 mr-2" />View Analytics
                </Button>
                <Button size="lg" variant="outline" onClick={handleRefreshAll}
                  className="border-2 border-white text-white hover:bg-white/10 font-semibold">
                  <RefreshCw className="w-5 h-5 mr-2" />Refresh
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

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
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

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-100 text-sm font-medium">Today's Revenue</p>
                  <p className="text-4xl font-bold">${stats?.todayRevenue?.toFixed(2) || '0.00'}</p>
                  <p className="text-blue-100 text-xs">From {orderStats?.orders.completed || 0} orders</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-100 text-sm font-medium">Total Orders</p>
                  <p className="text-4xl font-bold">{orderStats?.orders.total || 0}</p>
                  <p className="text-purple-100 text-xs">{orderStats?.orders.pending || 0} pending</p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

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

        {/* RECENT ORDERS */}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest customer orders</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => refetchOrders()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/admin/orders')}>
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No recent orders</div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order: Order) => (
                    <div key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                              <Button size="sm"
                                onClick={() => completeOrderMutation.mutate(order.id)}
                                disabled={completeOrderMutation.isPending}>
                                {completeOrderMutation.isPending ? (
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                ) : null}
                                Complete
                              </Button>
                              <Button size="sm" variant="outline"
                                onClick={() => rejectOrderMutation.mutate({ orderId: order.id })}
                                disabled={rejectOrderMutation.isPending}>
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

        {/* QUICK ACTIONS */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Quick Actions</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your store efficiently</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Pending Orders', count: orderStats?.orders.pending || 0, color: 'yellow', icon: Clock, link: '/admin/orders?status=PENDING' },
                { title: 'Low Stock Alert', count: lowStockProducts.length, color: 'red', icon: AlertCircle, link: '/admin/inventory' },
                { title: 'Manage Products', count: stats?.totalProducts || 0, color: 'blue', icon: ShoppingBag, link: '/admin/products' },
                { title: 'Scan QR Code', sub: 'Process payments', color: 'green', icon: QrCode, link: '/admin/scan-qr', primary: true },
                { title: 'View Analytics', sub: 'Detailed insights', color: 'purple', icon: BarChart3, link: '/admin/analytics' },
                { title: 'All Orders', count: orderStats?.orders.total || 0, color: 'teal', icon: Package, link: '/admin/orders' },
              ].map((action, idx) => (
                <Button key={idx}
                  variant={action.primary ? 'default' : 'outline'}
                  className={`w-full justify-between h-auto p-6 ${
                    action.primary 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                      : `hover:bg-${action.color}-50 dark:hover:bg-${action.color}-900/20 border-2`
                  } transition-all duration-300 group ${idx === 3 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                  onClick={() => router.push(action.link)}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 ${
                      action.primary 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : `bg-gradient-to-br from-${action.color}-500 to-${action.color}-600`
                    } rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className={`w-7 h-7 ${action.primary ? 'text-white' : 'text-white'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg">{action.title}</p>
                      <p className={`text-sm ${action.primary ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {action.sub || `${action.count} ${action.title.toLowerCase()}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-6 h-6 ${
                    action.primary ? 'text-white' : 'text-gray-400'
                  } group-hover:translate-x-1 transition-all duration-300`} />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}