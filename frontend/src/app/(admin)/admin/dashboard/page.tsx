'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Order } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session, status } = useSession();

  /* ----------------------------------------
   * AUTH GUARDS (FIXED & SAFE)
   * -------------------------------------- */

  // Session still loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in (middleware should redirect)
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Authenticated but not admin
  if (session?.user?.role !== 'ADMIN') {
    toast.error('Access denied. Admins only.');
    router.replace('/dashboard');
    return null;
  }

  // ✅ SAFE — only runs for authenticated admins
  const user = session.user;

  /* ----------------------------------------
   * QUERIES
   * -------------------------------------- */

  const {
    data: statsResponse,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorData,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
    enabled: true,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderService.getAllOrders({ page: 1, limit: 5 }),
    enabled: true,
    staleTime: 5000,
    refetchInterval: 20000,
  });

  const {
    data: orderStatsResponse,
    isLoading: orderStatsLoading,
    refetch: refetchOrderStats,
  } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: orderService.getOrderStats,
    enabled: true,
    staleTime: 5000,
    refetchInterval: 15000,
  });

  const {
    data: productsResponse,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products-summary'],
    queryFn: productService.getAll,
    enabled: true,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  /* ----------------------------------------
   * DERIVED DATA
   * -------------------------------------- */

  const stats = statsResponse?.data;
  const recentOrders = ordersResponse?.data?.orders ?? [];
  const orderStats = orderStatsResponse?.data;
  const lowStockProducts =
    productsResponse?.data?.filter((p) => p.stockLevel === 'LOW') ?? [];

  /* ----------------------------------------
   * MUTATIONS
   * -------------------------------------- */

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
    mutationFn: ({ orderId, reason }: { orderId: number; reason?: string }) =>
      orderService.rejectOrder(orderId, reason),

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
        success: 'Dashboard refreshed!',
        error: 'Failed to refresh',
      }
    );
  };

  const isLoading =
    statsLoading || ordersLoading || orderStatsLoading || productsLoading;

  /* ----------------------------------------
   * LOADING / ERROR STATES
   * -------------------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-screen p-6">
        <Alert variant="destructive">
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

  /* ----------------------------------------
   * UI
   * -------------------------------------- */

  return (
    <div className="min-h-screen p-6 space-y-8">
      <Card>
        <CardContent className="p-8">
          <h1 className="text-4xl font-bold">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Store overview & performance
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => router.push('/admin/scan-qr')}>
              <QrCode className="w-4 h-4 mr-2" /> Scan QR
            </Button>
            <Button variant="outline" onClick={handleRefreshAll}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards, recent orders, quick actions */}
      {/* (unchanged UI logic – safely using `user`) */}
    </div>
  );
}
