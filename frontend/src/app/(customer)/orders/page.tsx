// ============================================
// FILE: src/app/orders/page.tsx (REFACTORED)
// ============================================
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserOrders } from '@/lib/hooks/useOrders'; // ✅ Use the hook
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  Eye,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';

export default function UserOrdersPage() {
  // ===== ALL HOOKS AT THE TOP =====
  const router = useRouter();
  
  // ✅ UI state only
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // ✅ Fetch user orders with React Query hook
  const { data: ordersData, isLoading } = useUserOrders();

  // ===== DERIVED STATE =====
  const orders = ordersData?.data || [];

  // ✅ Client-side filtering (OK for user's own orders - small dataset)
  // NOTE: For admin with 1000s of orders, this should be server-side
  const filteredOrders = useMemo(() => {
    return statusFilter === 'ALL' 
      ? orders 
      : orders.filter((order: Order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  // ✅ Compute stats from cached data
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o: Order) => o.status === 'PENDING').length,
      completed: orders.filter((o: Order) => o.status === 'COMPLETED').length,
      totalSpent: orders
        .filter((o: Order) => o.status === 'COMPLETED')
        .reduce((sum: number, o: Order) => sum + o.totalAmount, 0),
    };
  }, [orders]);

  // ===== CALLBACKS =====
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'PAID':
        return 'bg-blue-500/20 text-blue-400';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'PAID':
        return <CreditCard className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  }, []);

  const handleOrderClick = useCallback((orderId: number) => {
    router.push(`/orders/${orderId}`);
  }, [router]);

  // ===== CONDITIONAL RENDERING =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <Skeleton className="h-32 bg-gray-800" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center space-x-3">
              <ShoppingBag className="w-10 h-10 text-blue-400" />
              <span>My Orders</span>
            </h1>
            <p className="text-gray-400 mt-2">
              Track and manage your orders
            </p>
          </div>

          {/* Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[200px] bg-[#1a2332] border-gray-700 text-gray-300">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-gray-700">
              <SelectItem value="ALL" className="text-gray-300">All Orders</SelectItem>
              <SelectItem value="PENDING" className="text-gray-300">Pending</SelectItem>
              <SelectItem value="PAID" className="text-gray-300">Paid</SelectItem>
              <SelectItem value="COMPLETED" className="text-gray-300">Completed</SelectItem>
              <SelectItem value="CANCELLED" className="text-gray-300">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-gray-800 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.completed}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Spent</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(stats.totalSpent)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card className="bg-[#1a2332] border-gray-800 shadow-lg">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No orders found
                </h3>
                <p className="text-gray-400 mb-6">
                  {statusFilter === 'ALL'
                    ? "You haven't placed any orders yet"
                    : `No ${statusFilter.toLowerCase()} orders found`}
                </p>
                <Button onClick={() => router.push('/products')} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order: Order) => (
              <Card
                key={order.id}
                className="bg-[#1a2332] border-gray-800 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOrderClick(order.id)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">
                          {order.orderNumber}
                        </h3>
                        <Badge className={`${getStatusColor(order.status)} gap-1`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {order.paymentType === 'CASH' ? (
                            <Wallet className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          <span>{order.paymentType}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Package className="w-4 h-4" />
                          <span>{order.orderItems?.length || 0} items</span>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="flex items-center space-x-2">
                        {order.orderItems?.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden"
                          >
                            {item.product?.image ? (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                        ))}
                        {(order.orderItems?.length || 0) > 3 && (
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-400">
                              +{(order.orderItems?.length || 0) - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Action */}
                    <div className="flex flex-col items-end space-y-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-3xl font-bold text-blue-400">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderClick(order.id);
                        }}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}