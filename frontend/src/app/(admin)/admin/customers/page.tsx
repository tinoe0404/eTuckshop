'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import {
  Search,
  Users,
  Eye,
  Trash2,
  Mail,
  ShoppingBag,
  DollarSign,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  UserCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Import optimized hooks and store
import {
  useCustomers,
  useCustomerStats,
  useCustomer,
  useDeleteCustomer,
} from '@/lib/hooks/useCustomers';
import { useCustomerUIStore } from '@/lib/store/useCustomerUIStore';
import { Customer } from '@/lib/http-service/customers/types';

export default function AdminCustomersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auth protection with useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin only.');
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  // UI Store (Zustand)
  const {
    searchQuery,
    currentPage,
    pageSize,
    viewingCustomer,
    deletingCustomerId,
    setSearchQuery,
    setCurrentPage,
    openViewDialog,
    closeViewDialog,
    openDeleteDialog,
    closeDeleteDialog,
  } = useCustomerUIStore();

  // Server State (React Query)
  const { data: customersResponse, isLoading } = useCustomers({
    search: searchQuery,
    page: currentPage,
    limit: pageSize,
  });

  const { data: statsResponse } = useCustomerStats();

  const { data: customerDetailsResponse, isLoading: detailsLoading } = useCustomer(
    viewingCustomer?.id
  );

  // Mutation with optimistic updates
  const deleteCustomerMutation = useDeleteCustomer();

  // Data variables
  // Note: customersResponse IS the data from the API client (CustomerListResponse)
  const customers: Customer[] = (customersResponse?.customers as Customer[]) || [];
  const pagination = customersResponse?.pagination;
  const stats = statsResponse; // statsResponse IS the data (OrderStats/CustomerStats)
  const customerDetails: Customer | null = customerDetailsResponse || null;

  // Memoized total pages
  const totalPages = useMemo(() => {
    return pagination?.totalPages || 1;
  }, [pagination]);

  // Handlers
  const handleViewCustomer = (customer: Customer) => {
    openViewDialog(customer);
  };

  const handleDeleteCustomer = (id: number) => {
    openDeleteDialog(id);
  };

  const confirmDelete = () => {
    if (deletingCustomerId) {
      deleteCustomerMutation.mutate(deletingCustomerId, {
        onSuccess: () => {
          closeDeleteDialog();
        },
      });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  /* =========================
     MOBILE CUSTOMER CARD
  ========================= */
  const MobileCustomerCard = ({ customer }: { customer: Customer }) => (
    <Card className="bg-[#1a2332] border-gray-800">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-semibold text-lg">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-lg">{customer.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <Mail className="w-3 h-3" />
                <span className="truncate">{customer.email}</span>
              </div>
              <Badge
                variant="outline"
                className="border-gray-700 text-xs mt-2"
              >
                {customer.totalOrders === 0 ? 'New Customer' : 'Active'}
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0f1419] p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-400">Orders</p>
              </div>
              <p className="text-xl font-bold text-white">
                {customer.totalOrders || 0}
              </p>
              <p className="text-xs text-gray-500">
                {customer.completedOrders || 0} completed
              </p>
            </div>

            <div className="bg-[#0f1419] p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-400" />
                <p className="text-xs text-gray-400">Spent</p>
              </div>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(customer.totalSpent || 0)}
              </p>
            </div>
          </div>

          {/* Last Order & Joined */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#0f1419] p-2 rounded">
              <p className="text-xs text-gray-400">Last Order</p>
              {customer.lastOrder ? (
                <div className="mt-1">
                  <p className="text-white font-medium text-xs">
                    {customer.lastOrder.orderNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(customer.lastOrder.date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-xs mt-1">No orders</p>
              )}
            </div>

            <div className="bg-[#0f1419] p-2 rounded">
              <p className="text-xs text-gray-400">Joined</p>
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-white">
                  {new Date(customer.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewCustomer(customer)}
              className="flex-1 border-gray-700 text-blue-400 hover:bg-blue-900/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDeleteCustomer(customer.id)}
              className="border-gray-700 text-red-400 hover:bg-red-900/20"
              disabled={(customer.totalOrders || 0) > 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {(customer.totalOrders || 0) > 0 && (
            <p className="text-xs text-yellow-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cannot delete (has orders)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Auth checks
  if (status === 'loading' || status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Loading state
  if (isLoading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
        <Skeleton className="h-12 w-64 bg-gray-800" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-gray-800" />
          ))}
        </div>
        <Card className="bg-[#1a2332] border-gray-800 mt-6">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-800" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Customers Management</h1>
            <p className="text-gray-400 mt-1 text-sm">View and manage all registered customers</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalCustomers}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">Active</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stats.activeCustomers}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">New</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stats.newCustomersThisMonth}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-gray-400 text-xs sm:text-sm font-medium">Inactive</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stats.inactiveCustomers}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            {pagination && (
              <div className="mt-4 text-sm text-gray-400">
                Showing {customers.length} of {pagination.total} customers
              </div>
            )}
          </CardContent>
        </Card>

        {/* DESKTOP TABLE - Hidden on mobile */}
        <div className="hidden md:block">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-400">Customer</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Orders</TableHead>
                      <TableHead className="text-gray-400">Total Spent</TableHead>
                      <TableHead className="text-gray-400">Last Order</TableHead>
                      <TableHead className="text-gray-400">Joined</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                          <p>No customers found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="border-gray-800 hover:bg-gray-800/50"
                        >
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <span className="text-blue-400 font-semibold">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-white">{customer.name}</p>
                                <Badge
                                  variant="outline"
                                  className="border-gray-700 text-xs mt-1"
                                >
                                  {customer.totalOrders === 0 ? 'New' : 'Active'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{customer.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <ShoppingBag className="w-4 h-4 text-gray-500" />
                              <span className="text-white font-semibold">
                                {customer.totalOrders || 0}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({customer.completedOrders || 0} completed)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-green-400 font-semibold">
                                {formatCurrency(customer.totalSpent || 0)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {customer.lastOrder ? (
                              <div>
                                <p className="text-white font-medium">
                                  {customer.lastOrder.orderNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(customer.lastOrder.date).toLocaleDateString()}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500">No orders</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(customer.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewCustomer(customer)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                disabled={(customer.totalOrders || 0) > 0}
                                title={
                                  (customer.totalOrders || 0) > 0
                                    ? 'Cannot delete customer with orders'
                                    : 'Delete customer'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
                  <div className="text-sm text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages || isLoading}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      Next
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
          {customers.length === 0 ? (
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No customers found</p>
              </CardContent>
            </Card>
          ) : (
            customers.map((customer) => (
              <MobileCustomerCard key={customer.id} customer={customer} />
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
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages || isLoading}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* View Customer Dialog */}
        <Dialog open={viewingCustomer !== null} onOpenChange={closeViewDialog}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Customer Details</DialogTitle>
              <DialogDescription className="text-gray-400 break-all">
                {viewingCustomer?.name} - {viewingCustomer?.email}
              </DialogDescription>
            </DialogHeader>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : customerDetails ? (
              <div className="space-y-6 py-4">
                {/* Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-[#0f1419] rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-400">Total Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {customerDetails.statistics.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#0f1419] rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-400">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">
                      {customerDetails.statistics.completedOrders}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#0f1419] rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-400">Total Spent</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-400">
                      ${customerDetails.statistics.totalSpent}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#0f1419] rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-400">Avg Order</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-400">
                      ${customerDetails.statistics.averageOrderValue.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h3 className="font-semibold text-white mb-3">Recent Orders</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerDetails.recentOrders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No orders yet</p>
                    ) : (
                      customerDetails.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3 bg-[#0f1419] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                            <p className="font-semibold text-blue-400">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            <Badge
                              className={
                                order.status === 'COMPLETED'
                                  ? 'bg-green-500/20 text-green-400'
                                  : order.status === 'PAID'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                              }
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeViewDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deletingCustomerId !== null}
          onOpenChange={closeDeleteDialog}
        >
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                <div className="space-y-2">
                  <p>
                    This action cannot be undone. This will permanently delete the
                    customer account.
                  </p>
                  <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Note: You can only delete customers that have no orders.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel
                onClick={closeDeleteDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteCustomerMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}