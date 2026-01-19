'use client';

import { useMemo, useState } from 'react';
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
import { toast } from 'sonner';
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
    User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order, OrderStats } from '@/lib/api/orders/orders.types';
import { OrderStatus, PaymentType } from '@/lib/api/orders/orders.store'; // Keep types from store if used, or use valid string literals
import { useCompleteOrder, useRejectOrder } from '@/lib/api/orders/orders.hooks';

interface AdminOrdersClientProps {
    initialOrders: Order[];
    initialPagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    stats: OrderStats | null;
}

export default function AdminOrdersClient({
    initialOrders,
    initialPagination,
    stats,
}: AdminOrdersClientProps) {
    const router = useRouter();

    // Local State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
    const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentType>('ALL');
    // const [currentPage, setCurrentPage] = useState(initialPagination.page); // If client-side pagination only

    // Dialog States
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null); // Full object for viewing
    const [completingOrderId, setCompletingOrderId] = useState<number | null>(null);
    const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Mutations
    const completeOrderMutation = useCompleteOrder();
    const rejectOrderMutation = useRejectOrder();

    // Derived
    const orders = initialOrders;
    const pagination = initialPagination;

    // Filter Logic (Client-side for now, or trigger router push for server-side)
    // Implementing client-side filtering on the *current page* of orders, which is limited. 
    // Ideally, filters should reload the page with new params.
    // For this refactor, I'll keep the client-side search/filter on the data we have, 
    // but note that "Search" usually implies a server query. 
    // Given the previous code essentially did client-side filtering on `ordersResponse.orders`, I will replicate that behavior for now
    // but ideally we should push to URL params: ?status=PENDING&page=1

    const filteredOrders = useMemo(() => {
        let result = orders;

        // 1. Status Filter
        if (statusFilter !== 'ALL') {
            result = result.filter(o => o.status === statusFilter);
        }

        // 2. Payment Filter
        if (paymentFilter !== 'ALL') {
            result = result.filter(o => o.paymentType === paymentFilter);
        }

        // 3. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (order) =>
                    order.orderNumber.toLowerCase().includes(query) ||
                    order.user?.name.toLowerCase().includes(query) ||
                    order.user?.email.toLowerCase().includes(query)
            );
        }
        return result;
    }, [orders, searchQuery, statusFilter, paymentFilter]);

    // Handlers
    const handlePageChange = (newPage: number) => {
        // Navigate to new page to trigger server fetch
        // Preserve existing filters if we were using URL params, but here filters are local state...
        // To make this robust, we should sync local state to URL. 
        // For now, simple pagination on the URL.
        router.push(`/admin/orders?page=${newPage}`);
    };

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

    // Dialog Handlers
    const openViewDialog = (order: Order) => setViewingOrder(order);
    const closeViewDialog = () => setViewingOrder(null);

    const handleCompleteOrder = (orderId: number) => setCompletingOrderId(orderId);
    const closeCompleteDialog = () => setCompletingOrderId(null);

    const handleRejectOrder = (orderId: number) => setRejectingOrderId(orderId);
    const closeRejectDialog = () => {
        setRejectingOrderId(null);
        setRejectReason('');
    };

    const confirmComplete = () => {
        if (completingOrderId) {
            completeOrderMutation.mutate({ orderId: completingOrderId }, {
                onSuccess: () => {
                    closeCompleteDialog();
                    // router.refresh(); // Mutation hook might handle invalidation, but safe to do here if needed
                }
            });
        }
    };

    const confirmReject = () => {
        if (rejectingOrderId) {
            rejectOrderMutation.mutate({ orderId: rejectingOrderId, reason: rejectReason }, {
                onSuccess: () => {
                    closeRejectDialog();
                }
            });
        }
    };

    /* =========================
       MOBILE ORDER CARD
    ========================= */
    const MobileOrderCard = ({ order }: { order: Order }) => (
        <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-lg">{order.orderNumber}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="w-3 h-3 text-gray-400" />
                                <p className="text-sm text-gray-400 truncate">{order.user?.name}</p>
                            </div>
                        </div>

                        <Badge className={`${getStatusColor(order.status)} gap-1 ml-2`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                        </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <p className="text-xs text-gray-400">Amount</p>
                            <p className="text-lg font-bold text-blue-400 mt-1">
                                {formatCurrency(order.totalAmount)}
                            </p>
                        </div>

                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <p className="text-xs text-gray-400">Items</p>
                            <p className="text-lg font-bold text-white mt-1">
                                {order.orderItems?.length || 0}
                            </p>
                        </div>

                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <p className="text-xs text-gray-400">Payment</p>
                            <div className="flex items-center gap-1 mt-1">
                                {order.paymentType === 'CASH' ? (
                                    <Wallet className="w-4 h-4 text-green-400" />
                                ) : (
                                    <CreditCard className="w-4 h-4 text-blue-400" />
                                )}
                                <p className="text-sm font-medium text-white">{order.paymentType}</p>
                            </div>
                        </div>

                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <p className="text-xs text-gray-400">Date</p>
                            <p className="text-sm font-medium text-white mt-1">
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openViewDialog(order)}
                            className="flex-1 border-gray-700 text-blue-400 hover:bg-blue-900/20"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                        </Button>

                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCompleteOrder(order.id)}
                                    className="flex-1 border-gray-700 text-green-400 hover:bg-green-900/20"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Complete
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleRejectOrder(order.id)}
                                    className="border-gray-700 text-red-400 hover:bg-red-900/20"
                                >
                                    <XCircle className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Orders Management</h1>
                        <p className="text-gray-400 mt-1 text-sm">View and manage all customer orders</p>
                    </div>
                    <Button
                        onClick={() => router.push('/admin/scan-qr')}
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Scan QR Code
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        <Card className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 sm:space-y-2">
                                        <p className="text-gray-400 text-xs sm:text-sm font-medium">Total</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-white">
                                            {stats.orders?.total || 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 sm:space-y-2">
                                        <p className="text-gray-400 text-xs sm:text-sm font-medium">Pending</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-yellow-400">
                                            {stats.orders?.pending || 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 sm:space-y-2">
                                        <p className="text-gray-400 text-xs sm:text-sm font-medium">Paid</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-blue-400">
                                            {stats.orders?.paid || 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 sm:space-y-2">
                                        <p className="text-gray-400 text-xs sm:text-sm font-medium">Done</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-green-400">
                                            {stats.orders?.completed || 0}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1a2332] border-gray-800 col-span-2 lg:col-span-1">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 sm:space-y-2">
                                        <p className="text-gray-400 text-xs sm:text-sm font-medium">Revenue</p>
                                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                                            ${typeof stats.revenue === 'number' ? stats.revenue.toFixed(2) : '0.00'}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <Card className="bg-[#1a2332] border-gray-800">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder="Search orders..."
                                    className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Filters Row */}
                            <div className="flex gap-3">
                                {/* Status Filter */}
                                <Select
                                    value={statusFilter}
                                    onValueChange={(value: 'ALL' | OrderStatus) => setStatusFilter(value)}
                                >
                                    <SelectTrigger className="flex-1 bg-[#0f1419] border-gray-700 text-white">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                                        <SelectItem value="ALL" className="hover:bg-gray-700">All</SelectItem>
                                        <SelectItem value="PENDING" className="hover:bg-gray-700">Pending</SelectItem>
                                        <SelectItem value="PAID" className="hover:bg-gray-700">Paid</SelectItem>
                                        <SelectItem value="COMPLETED" className="hover:bg-gray-700">Completed</SelectItem>
                                        <SelectItem value="CANCELLED" className="hover:bg-gray-700">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Payment Type Filter */}
                                <Select
                                    value={paymentFilter}
                                    onValueChange={(value: 'ALL' | PaymentType) => setPaymentFilter(value)}
                                >
                                    <SelectTrigger className="flex-1 bg-[#0f1419] border-gray-700 text-white">
                                        <SelectValue placeholder="Payment" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                                        <SelectItem value="ALL" className="hover:bg-gray-700">All</SelectItem>
                                        <SelectItem value="CASH" className="hover:bg-gray-700">Cash</SelectItem>
                                        <SelectItem value="PAYNOW" className="hover:bg-gray-700">PayNow</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {pagination && (
                            <div className="mt-4 text-sm text-gray-400">
                                Showing {filteredOrders.length} of {pagination.total} orders
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block">
                    <Card className="bg-[#1a2332] border-gray-800">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
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
                            </div>

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
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page === 1}
                                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page === pagination.totalPages}
                                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* MOBILE CARDS - Visible only on mobile */}
                <div className="md:hidden space-y-3">
                    {filteredOrders.length === 0 ? (
                        <Card className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-12 text-center">
                                <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-400">No orders found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOrders.map((order: Order) => (
                            <MobileOrderCard key={order.id} order={order} />
                        ))
                    )}

                    {/* Mobile Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-gray-400">
                                Page {pagination.page} of {pagination.totalPages}
                            </p>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* View Order Dialog */}
                <Dialog open={viewingOrder !== null} onOpenChange={closeViewDialog}>
                    <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Name</p>
                                            <p className="text-white">{viewingOrder.user?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Email</p>
                                            <p className="text-white break-all">{viewingOrder.user?.email}</p>
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
                                            <Badge className={`${getStatusColor(viewingOrder.status)} mt-1`}>
                                                {viewingOrder.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Created</p>
                                            <p className="text-white text-xs sm:text-sm">
                                                {new Date(viewingOrder.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        {viewingOrder.paidAt && (
                                            <div>
                                                <p className="text-gray-400">Paid At</p>
                                                <p className="text-white text-xs sm:text-sm">
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
                                                className="flex justify-between items-start sm:items-center p-3 bg-[#0f1419] rounded-lg gap-3"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium">{item.product?.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        Qty: {item.quantity} × {formatCurrency(item.product?.price || 0)}
                                                    </p>
                                                </div>
                                                <p className="text-blue-400 font-semibold whitespace-nowrap">
                                                    {formatCurrency(item.subtotal)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                                        <p className="font-semibold text-white">Total</p>
                                        <p className="text-xl font-bold text-blue-400">
                                            {formatCurrency(viewingOrder.totalAmount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={closeViewDialog} variant="outline" className="border-gray-700 text-gray-300">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Complete Order Dialog */}
                <AlertDialog open={completingOrderId !== null} onOpenChange={closeCompleteDialog}>
                    <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Complete Order?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to mark this order as completed? This usually means the customer has collected their items.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmComplete}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={completeOrderMutation.isPending}
                            >
                                {completeOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Complete'}
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
                                Are you sure you want to reject/cancel this order?
                            </AlertDialogDescription>
                            <div className="pt-4">
                                <Label htmlFor="reason" className="text-gray-300">Reason (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="E.g. Item out of stock"
                                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmReject}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={rejectOrderMutation.isPending}
                            >
                                {rejectOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
