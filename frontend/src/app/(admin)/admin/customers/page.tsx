'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/lib/api/services/customer.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TrendingUp,
  UserCheck,
  UserX,
  Crown,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ========================
// Types
// ========================
export interface CustomerStatistics {
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  pendingOrders: number;
  paidOrders: number;
  cancelledOrders: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;

  // These are required for details
  statistics: CustomerStatistics;
  recentOrders: Order[];

  // Optional for table listing
  totalOrders?: number;
  completedOrders?: number;
  totalSpent?: number;
  lastOrder?: {
    orderNumber: string;
    amount: number;
    date: string;
  } | null;
}

// ========================
// Component
// ========================
export default function AdminCustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);

  // Fetch customers list
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['admin-customers', searchQuery, currentPage, pageSize],
    queryFn: () =>
      customerService.getAll({
        search: searchQuery,
        page: currentPage,
        limit: pageSize,
      }),
  });

  // Fetch overall customer stats
  const { data: statsResponse } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: customerService.getStats,
  });

  // Fetch single customer details
  const { data: customerDetailsResponse, isLoading: detailsLoading } = useQuery({
    queryKey: ['customer-details', viewingCustomer?.id],
    queryFn: () => customerService.getById(viewingCustomer?.id as number),
    enabled: !!viewingCustomer,
  });

  // Delete mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] });
      toast.success(response.message || 'Customer deleted successfully');
      setDeletingCustomerId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    },
  });

  // Data variables
  const customers: Customer[] = customersResponse?.data?.customers || [];
  const pagination = customersResponse?.data?.pagination;
  const stats = statsResponse?.data;
  const customerDetails: Customer | null = customerDetailsResponse?.data || null;

  // Handlers
  const handleViewCustomer = (customer: Customer) => setViewingCustomer(customer);
  const handleDeleteCustomer = (id: number) => setDeletingCustomerId(id);
  const confirmDelete = () => deletingCustomerId && deleteCustomerMutation.mutate(deletingCustomerId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-6">
        <Skeleton className="h-12 w-64 bg-gray-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers Management</h1>
          <p className="text-gray-400 mt-1">View and manage all registered customers</p>
        </div>
      </div>

      {/* Customers Table */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardContent className="p-0">
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
                  <TableRow key={customer.id} className="border-gray-800 hover:bg-gray-800/50">
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
                          <p className="text-white font-medium">{customer.lastOrder.orderNumber}</p>
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
                        <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
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
                          disabled={customer.totalOrders! > 0}
                          title={customer.totalOrders! > 0 ? 'Cannot delete customer with orders' : 'Delete customer'}
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
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={viewingCustomer !== null} onOpenChange={() => setViewingCustomer(null)}>
        <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Customer Details</DialogTitle>
            <DialogDescription className="text-gray-400">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{customerDetails.statistics.totalOrders}</p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{customerDetails.statistics.completedOrders}</p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400">Total Spent</p>
                  <p className="text-2xl font-bold text-blue-400">${customerDetails.statistics.totalSpent}</p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400">Avg Order</p>
                  <p className="text-2xl font-bold text-purple-400">${customerDetails.statistics.averageOrderValue.toFixed(0)}</p>
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
                      <div key={order.id} className="p-3 bg-[#0f1419] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-400">{formatCurrency(order.totalAmount)}</p>
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
              onClick={() => setViewingCustomer(null)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
