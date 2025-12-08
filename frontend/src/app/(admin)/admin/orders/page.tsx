'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  CreditCard,
  Wallet,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

// Import optimized hooks and store
import { useOrders, useOrderStats, useCompleteOrder, useRejectOrder } from '@/lib/hooks/useOrders';
import { useOrderUIStore, OrderStatus, PaymentType } from '@/lib/store/useOrderUIStore';

export default function AdminOrdersPage() {
  const router = useRouter();

  // UI Store (Zustand)
  const {
    searchQuery,
    statusFilter,
    paymentFilter,
    currentPage,
    viewingOrder,
    completingOrderId,
    rejectingOrderId,
    rejectReason,
    setSearchQuery,
    setStatusFilter,
    setPaymentFilter,
    setCurrentPage,
    openViewDialog,
    closeViewDialog,
    openCompleteDialog,
    closeCompleteDialog,
    openRejectDialog,
    closeRejectDialog,
    setRejectReason,
  } = useOrderUIStore();

  // Server State (React Query)
  const { data: ordersResponse, isLoading } = useOrders({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    paymentType: paymentFilter !== 'ALL' ? paymentFilter : undefined,
    page: currentPage,
    limit: 10,
  });

  const { data: statsResponse } = useOrderStats();

  // Mutations with optimistic updates
  const completeOrderMutation = useCompleteOrder();
  const rejectOrderMutation = useRejectOrder();

  const orders = ordersResponse?.data?.orders || [];
  const pagination = ordersResponse?.data?.pagination;
  const stats = statsResponse?.data;

  // Filter orders by search query (client-side for current page)
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order: Order) =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PAID':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
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
  };

  // Handlers
  const handleCompleteOrder = (orderId: number) => {
    openCompleteDialog(orderId);
  };

  const confirmComplete = () => {
    if (completingOrderId) {
      completeOrderMutation.mutate(completingOrderId, {
        onSuccess: () => {
          closeCompleteDialog();
        },
      });
    }
  };

  const handleRejectOrder = (orderId: number) => {
    openRejectDialog(orderId);
  };

  const confirmReject = () => {
    if (rejectingOrderId) {
      rejectOrderMutation.mutate(
        {
          orderId: rejectingOrderId,
          reason: rejectReason,
        },
        {
          onSuccess: () => {
            closeRejectDialog();
          },
        }
      );
    }
  };

  // Loading state
  if (isLoading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 bg-gray-800" />
            ))}
          </div>
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-gray-800" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Orders Management</h1>
            <p className="text-gray-400 mt-1">View and manage all customer orders</p>
          </div>
          <Button
            onClick={() => router.push('/admin/scan-qr')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Package className="w-4 h-4 mr-2" />
            Scan QR Code
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Total Orders</p>
                    <p className="text-3xl font-bold text-white">
                      {stats.orders?.total || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Pending</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {stats.orders?.pending || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Paid</p>
                    <p className="text-3xl font-bold text-blue-400">
                      {stats.orders?.paid || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Completed</p>
                    <p className="text-3xl font-bold text-green-400">
                      {stats.orders?.completed || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-white">
                      ${(stats.revenue || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by order number, customer name or email..."
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: OrderStatus) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="ALL" className="hover:bg-gray-700">
                    All Status
                  </SelectItem>
                  <SelectItem value="PENDING" className="hover:bg-gray-700">
                    Pending
                  </SelectItem>
                  <SelectItem value="PAID" className="hover:bg-gray-700">
                    Paid
                  </SelectItem>
                  <SelectItem value="COMPLETED" className="hover:bg-gray-700">
                    Completed
                  </SelectItem>
                  <SelectItem value="CANCELLED" className="hover:bg-gray-700">
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Type Filter */}
              <Select
                value={paymentFilter}
                onValueChange={(value: PaymentType) => setPaymentFilter(value)}
              >
                <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="ALL" className="hover:bg-gray-700">
                    All Payments
                  </SelectItem>
                  <SelectItem value="CASH" className="hover:bg-gray-700">
                    Cash
                  </SelectItem>
                  <SelectItem value="PAYNOW" className="hover:bg-gray-700">
                    PayNow
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pagination && (
              <div className="mt-4 text-sm text-gray-400">
                Showing {filteredOrders.length} of {pagination.total} orders
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Order</TableHead>
                  <TableHead className="text-gray-400">Customer</TableHead>
                  <TableHead className="text-gray-400">Payment</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p>No orders found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order: Order) => (
                    <TableRow
                      key={order.id}
                      className="border-gray-800 hover:bg-gray-800/50"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">
                            {order.orderItems?.length || 0} items
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{order.user?.name}</p>
                          <p className="text-xs text-gray-400">{order.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-700 gap-1">
                          {order.paymentType === 'CASH' ? (
                            <Wallet className="w-3 h-3" />
                          ) : (
                            <CreditCard className="w-3 h-3" />
                          )}
                          {order.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-400 font-semibold">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status)} gap-1`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openViewDialog(order)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status !== 'COMPLETED' &&
                            order.status !== 'CANCELLED' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                  title="Mark as completed"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRejectOrder(order.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  title="Reject order"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
                <p className="text-sm text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages || isLoading}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={viewingOrder !== null} onOpenChange={closeViewDialog}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Order Details</DialogTitle>
              <DialogDescription className="text-gray-400">
                {viewingOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Name</p>
                      <p className="text-white">{viewingOrder.user?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-white">{viewingOrder.user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Payment Type</p>
                      <Badge variant="outline" className="border-gray-700 mt-1">
                        {viewingOrder.paymentType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <Badge
                        className={`${getStatusColor(viewingOrder.status)} mt-1`}
                      >
                        {viewingOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-400">Created</p>
                      <p className="text-white">
                        {new Date(viewingOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {viewingOrder.paidAt && (
                      <div>
                        <p className="text-gray-400">Paid At</p>
                        <p className="text-white">
                          {new Date(viewingOrder.paidAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Order Items</h3>
                  <div className="space-y-2">
                    {viewingOrder.orderItems?.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-[#0f1419] rounded-lg"
                      >
                        <div>
                          <p className="text-white">{item.product?.name}</p>
                          <p className="text-xs text-gray-400">
                            Qty: {item.quantity} ×{' '}
                            {formatCurrency(item.product?.price || 0)}
                          </p>
                        </div>
                        <p className="text-blue-400 font-semibold">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                    <p className="font-semibold text-white">Total</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(viewingOrder.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeViewDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Order Dialog */}
        <AlertDialog
          open={completingOrderId !== null}
          onOpenChange={closeCompleteDialog}
        >
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Complete Order?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Mark this order as completed. The QR code will be expired and the
                order cannot be modified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={closeCompleteDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmComplete}
                disabled={completeOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {completeOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Mark Complete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Order Dialog */}
        <AlertDialog open={rejectingOrderId !== null} onOpenChange={closeRejectDialog}>
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Order?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This will cancel the order and restore the stock. Optionally provide
                a reason.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="reason" className="text-gray-300">
                Reason (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2 bg-[#0f1419] border-gray-700 text-white"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={closeRejectDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmReject}
                disabled={rejectOrderMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejectOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Order'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}