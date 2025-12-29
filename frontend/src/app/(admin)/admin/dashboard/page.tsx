'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  Sparkles,
  BarChart3,
  QrCode,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  /* =========================
     QUERIES - MOVE TO TOP ✅
  ========================= */
  const { data: statsResponse, isLoading: statsLoading, isError: statsError, error: statsErrorData, refetch: refetchStats } =
    useQuery({
      queryKey: ['admin-dashboard-stats'],
      queryFn: analyticsService.getDashboardStats,
      staleTime: 10000,
      refetchInterval: 30000,
      enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
      retry: 1,
      retryDelay: 1000,
    });

  const { data: ordersResponse, isLoading: ordersLoading, refetch: refetchOrders } =
    useQuery({
      queryKey: ['admin-recent-orders'],
      queryFn: () => orderService.getAllOrders({ page: 1, limit: 5 }),
      staleTime: 5000,
      refetchInterval: 20000,
      enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
      retry: 1,
      retryDelay: 1000,
    });

  const { data: orderStatsResponse, isLoading: orderStatsLoading, refetch: refetchOrderStats } =
    useQuery({
      queryKey: ['admin-order-stats'],
      queryFn: orderService.getOrderStats,
      staleTime: 5000,
      refetchInterval: 15000,
      enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
      retry: 1,
      retryDelay: 1000,
    });

  const { data: productsResponse, isLoading: productsLoading, refetch: refetchProducts } =
    useQuery({
      queryKey: ['admin-products-summary'],
      queryFn: () => productService.getAll({ limit: 6, sort: 'desc' }),
      staleTime: 30000,
      refetchInterval: 60000,
      enabled: status === 'authenticated' && session?.user?.role === 'ADMIN',
      retry: 1,
      retryDelay: 1000,
    });


  /* =========================
     DERIVED DATA
  ========================= */
  const stats = statsResponse?.data;
  const recentOrders: Order[] = ordersResponse?.data?.orders ?? [];
  const orderStats = orderStatsResponse?.data;

  /* =========================
     MUTATIONS
  ========================= */
  const completeOrderMutation = useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    onSuccess: async () => {
      toast.success('Order completed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to complete order');
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: number }) =>
      orderService.rejectOrder(orderId),
    onSuccess: async () => {
      toast.success('Order rejected');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recent-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-order-stats'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to reject order');
    },
  });

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
        success: 'Dashboard refreshed',
        error: 'Refresh failed',
      }
    );
  };

  const isLoading =
    statsLoading || ordersLoading || orderStatsLoading || productsLoading;

  // Auth protection with useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admins only.');
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  /* =========================
     AUTH GUARDS - NOW AFTER ALL HOOKS ✅
  ========================= */
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Type guard - at this point we know user exists and is ADMIN
  if (!session?.user) {
    return null;
  }

  const user = session.user;

  /* =========================
     LOADING / ERROR
  ========================= */
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64 bg-gray-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {(statsErrorData as any)?.response?.data?.message ||
              'Failed to load dashboard'}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => refetchStats()}>
          Retry
        </Button>
      </div>
    );
  }

  /* =========================
     UI - CONTENT ONLY (NO HEADER/SIDEBAR)
  ========================= */
  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-8 md:p-10 text-white shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            Admin Dashboard
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-blue-100 mt-2">
            Store overview & performance metrics
          </p>

          <div className="flex gap-3 mt-6">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => router.push('/admin/scan-qr')}
            >
              <QrCode className="w-5 h-5 mr-2" /> Scan QR
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="w-5 h-5 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'blue' },
          { label: "Today's Revenue", value: formatCurrency(stats?.todayRevenue || 0), icon: TrendingUp, color: 'green' },
          { label: 'Total Orders', value: orderStats?.orders.total || 0, icon: Package, color: 'purple' },
          { label: 'Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'orange' },
        ].map((s, i) => (
          <Card key={i} className="bg-[#1a2332] border-gray-800 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">{s.label}</p>
                  <p className="text-3xl font-bold text-white">{s.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${s.color}-500/20 rounded-xl flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 text-${s.color}-400`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RECENT ORDERS */}
      <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              No recent orders
            </p>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center border border-gray-800 p-4 rounded-xl bg-[#0f1419] hover:bg-gray-800/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-white">{order.orderNumber}</p>
                  <p className="text-sm text-gray-400">
                    {order.user?.name}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="font-bold text-green-400">
                    {formatCurrency(order.totalAmount)}
                  </span>

                  {order.status === 'PAID' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() =>
                          completeOrderMutation.mutate(order.id)
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={() =>
                          rejectOrderMutation.mutate({ orderId: order.id })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* QUICK ACTIONS */}
      <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Orders', icon: Package, link: '/admin/orders' },
            { label: 'Products', icon: ShoppingBag, link: '/admin/products' },
            { label: 'Analytics', icon: BarChart3, link: '/admin/analytics' },
          ].map((a, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-20 justify-between border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              onClick={() => router.push(a.link)}
            >
              <div className="flex items-center gap-3">
                <a.icon className="w-6 h-6" />
                <span className="font-semibold">{a.label}</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}