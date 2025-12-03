'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminAnalyticsPage() {
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch analytics data
  const { data: analyticsResponse, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => analyticsService.getAnalytics(dateRange),
  });

  const analytics = analyticsResponse?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 bg-gray-800" />
            ))}
          </div>
          <Skeleton className="h-96 bg-gray-800" />
        </div>
      </div>
    );
  }

  const summary = analytics?.summary;
  const dailyStats = analytics?.dailyStats || [];
  const topProducts = analytics?.topProducts || [];
  const recentOrders = analytics?.recentOrders || [];

  // Calculate max values for chart scaling
  const maxSales = Math.max(...dailyStats.map(d => d.sales), 1);
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Overview of your store performance
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <Card className="bg-linear-to-br from-blue-900/40 to-blue-800/40 border-blue-700 overflow-hidden relative group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-200 text-sm font-medium">Total Users</p>
                  <p className="text-4xl font-bold text-white animate-fade-in">
                    {summary?.totalUsers || 0}
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
          <Card className="bg-linear-to-br from-purple-900/40 to-purple-800/40 border-purple-700 overflow-hidden relative group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-purple-200 text-sm font-medium">Total Products</p>
                  <p className="text-4xl font-bold text-white animate-fade-in">
                    {summary?.totalProducts || 0}
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
          <Card className="bg-linear-to-br from-green-900/40 to-green-800/40 border-green-700 overflow-hidden relative group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-green-200 text-sm font-medium">Total Sales</p>
                  <p className="text-4xl font-bold text-white animate-fade-in">
                    {summary?.totalSales || 0}
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
          <Card className="bg-linear-to-br from-orange-900/40 to-orange-800/40 border-orange-700 overflow-hidden relative group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-orange-200 text-sm font-medium">Total Revenue</p>
                  <p className="text-4xl font-bold text-white animate-fade-in">
                    ${summary?.totalRevenue?.toFixed(0) || 0}
                  </p>
                  <div className="flex items-center space-x-1 text-xs">
                    {(summary?.revenueGrowth || 0) >= 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">
                          +{summary?.revenueGrowth?.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-red-400">
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
          <Card className="bg-[#1a2332] border-gray-800 lg:col-span-2">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Daily Sales & Revenue Trends</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Last 30 days performance</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Legend */}
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-gray-400">Sales</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-gray-400">Revenue</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 relative">
                  {dailyStats.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No data available
                    </div>
                  ) : (
                    <div className="flex items-end justify-between h-full space-x-1">
                      {dailyStats.map((stat, index) => {
                        const salesHeight = (stat.sales / maxSales) * 100;
                        const revenueHeight = (stat.revenue / maxRevenue) * 100;
                        
                        return (
                          <div
                            key={index}
                            className="flex-1 flex flex-col items-center space-y-1 group"
                          >
                            {/* Revenue Bar */}
                            <div className="w-full flex flex-col items-center">
                              <div
                                className="w-full bg-green-500/30 hover:bg-green-500/50 transition-all duration-300 rounded-t relative group"
                                style={{ height: `${revenueHeight}%`, minHeight: '2px' }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                  ${stat.revenue}
                                </div>
                              </div>
                              {/* Sales Bar */}
                              <div
                                className="w-full bg-blue-500/30 hover:bg-blue-500/50 transition-all duration-300 relative group"
                                style={{ height: `${salesHeight}%`, minHeight: '2px' }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                  {stat.sales} sales
                                </div>
                              </div>
                            </div>
                            {/* Date Label */}
                            {index % 3 === 0 && (
                              <span className="text-xs text-gray-500 mt-2">
                                {new Date(stat.date).getDate()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-[#1a2332] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Top Products</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Best sellers</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    No sales data
                  </div>
                ) : (
                  topProducts.slice(0, 5).map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center space-x-3 p-3 bg-[#0f1419] rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
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
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="text-white">Recent Orders</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Latest transactions</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  No recent orders
                </div>
              ) : (
                recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">{order.user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400'
                            : order.status === 'PAID'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
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