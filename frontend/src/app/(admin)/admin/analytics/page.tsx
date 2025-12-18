'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  Package,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsData } from '@/types';

// ==========================================
// CUSTOM HOOKS FOR STATE MANAGEMENT
// ==========================================

const useDateRange = () => {
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>(() => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  });

  const [activePeriod, setActivePeriod] = useState<'7D' | '30D' | '90D'>('30D');

  const setLast7Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    setActivePeriod('7D');
  };

  const setLast30Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    setActivePeriod('30D');
  };

  const setLast90Days = () => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
    setActivePeriod('90D');
  };

  return {
    dateRange,
    activePeriod,
    setLast7Days,
    setLast30Days,
    setLast90Days,
  };
};

const useAnalytics = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['analytics', dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsService.getAnalytics(dateRange),
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AdminAnalyticsPage() {
  // ✅ FIX: ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { dateRange, activePeriod, setLast7Days, setLast30Days, setLast90Days } = useDateRange();
  
  const {
    data: analyticsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAnalytics(dateRange);

  const analytics: AnalyticsData | undefined = analyticsResponse?.data;
  const summary = analytics?.summary;
  const dailyStats = analytics?.dailyStats || [];
  const topProducts = analytics?.topProducts || [];
  const recentOrders = analytics?.recentOrders || [];

  // ✅ Memoized calculations for chart scaling - MUST BE BEFORE RETURNS
  const chartMetrics = useMemo(() => {
    if (dailyStats.length === 0) {
      return { maxSales: 1, maxRevenue: 1 };
    }

    return {
      maxSales: Math.max(...dailyStats.map((d) => d.sales), 1),
      maxRevenue: Math.max(...dailyStats.map((d) => d.revenue), 1),
    };
  }, [dailyStats]);

  const isPositiveGrowth = (summary?.revenueGrowth || 0) >= 0;

  // ✅ NOW IT'S SAFE TO RETURN CONDITIONALLY - ALL HOOKS HAVE BEEN CALLED
  
  // ==========================================
  // LOADING STATE
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 bg-gray-800" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 bg-gray-800 lg:col-span-2" />
            <Skeleton className="h-96 bg-gray-800" />
          </div>
          <Skeleton className="h-64 bg-gray-800" />
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 text-lg font-semibold">Failed to load analytics data</p>
          <p className="text-gray-400 text-sm max-w-md">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD UI
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Date Range Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Overview of your store performance
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Range Buttons */}
            <div className="flex gap-2">
              <button
                onClick={setLast7Days}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePeriod === '7D'
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700'
                }`}
              >
                7D
              </button>
              <button
                onClick={setLast30Days}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePeriod === '30D'
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700'
                }`}
              >
                30D
              </button>
              <button
                onClick={setLast90Days}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePeriod === '90D'
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700'
                }`}
              >
                90D
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 overflow-hidden relative group hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-blue-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-200 text-sm font-medium">Total Users</p>
                  <p className="text-4xl font-bold text-white">
                    {summary?.totalUsers?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-blue-300">Registered customers</p>
                </div>
                <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 overflow-hidden relative group hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm font-medium">Total Products</p>
                  <p className="text-4xl font-bold text-white">
                    {summary?.totalProducts?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-purple-300">In catalog</p>
                </div>
                <div className="w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-8 h-8 text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Sales */}
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 overflow-hidden relative group hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-green-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-200 text-sm font-medium">Total Sales</p>
                  <p className="text-4xl font-bold text-white">
                    {summary?.totalSales?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-green-300">Completed orders</p>
                </div>
                <div className="w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="w-8 h-8 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50 overflow-hidden relative group hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-orange-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-orange-200 text-sm font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold text-white">
                    {formatCurrency(summary?.totalRevenue || 0)}
                  </p>
                  <div className="flex items-center space-x-1 text-xs">
                    {isPositiveGrowth ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 font-semibold">
                          +{summary?.revenueGrowth?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3 h-3 text-red-400" />
                        <span className="text-red-400 font-semibold">
                          {summary?.revenueGrowth?.toFixed(1)}%
                        </span>
                      </>
                    )}
                    <span className="text-orange-300 ml-1">vs last period</span>
                  </div>
                </div>
                <div className="w-16 h-16 bg-orange-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-8 h-8 text-orange-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Sales & Revenue Chart */}
          <Card className="bg-slate-800/50 border border-slate-700 lg:col-span-2 shadow-xl backdrop-blur-sm">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white text-xl">
                Daily Sales & Revenue Trends
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Performance over last {activePeriod.replace('D', ' days')}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {dailyStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <Package className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-xl font-medium">No data available</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Sales data will appear here once you have orders
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-gray-300">Sales Count</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-gray-300">Revenue ($)</span>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-80 relative bg-slate-900/30 rounded-lg p-4">
                    <div className="flex items-end justify-between h-full gap-1">
                      {dailyStats.map((stat, index) => {
                        const salesHeight = Math.max(
                          (stat.sales / chartMetrics.maxSales) * 100,
                          3
                        );
                        const revenueHeight = Math.max(
                          (stat.revenue / chartMetrics.maxRevenue) * 100,
                          3
                        );

                        return (
                          <div
                            key={`${stat.date}-${index}`}
                            className="flex-1 flex gap-0.5 items-end justify-center min-w-[8px]"
                          >
                            {/* Sales Bar */}
                            <div className="flex-1 flex flex-col items-center relative group">
                              <div
                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 transition-all duration-200 rounded-t cursor-pointer"
                                style={{ height: `${salesHeight}%` }}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl z-20 pointer-events-none border border-gray-700">
                                  <div className="font-semibold text-blue-400">
                                    {stat.sales} sales
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {new Date(stat.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Revenue Bar */}
                            <div className="flex-1 flex flex-col items-center relative group">
                              <div
                                className="w-full bg-gradient-to-t from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 transition-all duration-200 rounded-t cursor-pointer"
                                style={{ height: `${revenueHeight}%` }}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl z-20 pointer-events-none border border-gray-700">
                                  <div className="font-semibold text-green-400">
                                    {formatCurrency(stat.revenue)}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {new Date(stat.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-axis labels */}
                  {dailyStats.length > 0 && (
                    <div className="flex justify-between text-xs text-gray-500 px-2">
                      <span>
                        {new Date(dailyStats[0]?.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {dailyStats.length > 2 && (
                        <span>
                          {new Date(
                            dailyStats[Math.floor(dailyStats.length / 2)]?.date
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      <span>
                        {new Date(
                          dailyStats[dailyStats.length - 1]?.date
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-slate-800/50 border border-slate-700 shadow-xl backdrop-blur-sm">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white text-xl">Top Products</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Best sellers</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-lg font-medium">No sales data</p>
                    <p className="text-sm text-gray-600 mt-1 text-center">
                      Top products will appear here
                    </p>
                  </div>
                ) : (
                  topProducts.slice(0, 5).map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 transition-colors border border-slate-700/50"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-400">
                          {product.totalSold}
                        </p>
                        <p className="text-xs text-gray-500">sold</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="bg-slate-800/50 border border-slate-700 shadow-xl backdrop-blur-sm">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white text-xl">Recent Orders</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Latest transactions</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-lg font-medium">No recent orders</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Recent orders will appear here
                  </p>
                </div>
              ) : (
                recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 transition-colors border border-slate-700/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                        <ShoppingCart className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order.user?.name || 'Guest User'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : order.status === 'PAID'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}