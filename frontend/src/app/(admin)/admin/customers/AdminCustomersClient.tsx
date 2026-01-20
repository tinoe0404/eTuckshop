'use client';

import { useMemo, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCustomerUIStore } from '@/lib/api/customers/customers.store';
import { Customer, CustomerStats, CustomerListResponse } from '@/lib/api/customers/customers.types';
import { deleteCustomerAction, getCustomerByIdAction } from '@/lib/api/customers/customers.actions';

interface AdminCustomersClientProps {
    initialCustomers: Customer[] | readonly Customer[];
    stats: CustomerStats | null;
}

export default function AdminCustomersClient({ initialCustomers, stats }: AdminCustomersClientProps) {
    const router = useRouter();
    const { data: session } = useSession();

    // Local state for view details
    const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // UI Store
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

    // Fetch details when viewing a customer
    useEffect(() => {
        if (viewingCustomer?.id) {
            setDetailsLoading(true);
            getCustomerByIdAction(viewingCustomer.id).then((res) => {
                setCustomerDetails(res.data);
                setDetailsLoading(false);
            });
        } else {
            setCustomerDetails(null);
        }
    }, [viewingCustomer]);

    // Client-side filtering & pagination (since API returns all)
    const filteredCustomers = useMemo(() => {
        let result = initialCustomers;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            );
        }

        return result;
    }, [initialCustomers, searchQuery]);

    const totalPages = Math.ceil(filteredCustomers.length / pageSize);
    const paginatedCustomers = filteredCustomers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Handlers
    const handleViewCustomer = (customer: Customer) => {
        openViewDialog(customer);
    };

    const handleDeleteCustomer = (id: number) => {
        openDeleteDialog(id);
    };

    const confirmDelete = async () => {
        if (deletingCustomerId) {
            setIsDeleting(true);
            const res = await deleteCustomerAction(deletingCustomerId);

            if (res.success) {
                toast.success('Customer deleted');
                closeDeleteDialog();
                router.refresh();
            } else {
                toast.error(res.message);
            }
            setIsDeleting(false);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to page 1 on search
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Mobile Card Component
    const MobileCustomerCard = ({ customer }: { customer: Customer }) => (
        <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4">
                <div className="space-y-3">
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
                            <Badge variant="outline" className="border-gray-700 text-xs mt-2">
                                {(customer.totalOrders || 0) === 0 ? 'New Customer' : 'Active'}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <ShoppingBag className="w-4 h-4 text-gray-400" />
                                <p className="text-xs text-gray-400">Orders</p>
                            </div>
                            <p className="text-xl font-bold text-white">{customer.totalOrders || 0}</p>
                            <p className="text-xs text-gray-500">{customer.completedOrders || 0} completed</p>
                        </div>
                        <div className="bg-[#0f1419] p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                <p className="text-xs text-gray-400">Spent</p>
                            </div>
                            <p className="text-xl font-bold text-green-400">{formatCurrency(customer.totalSpent || 0)}</p>
                        </div>
                    </div>

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
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Customers Management</h1>
                        <p className="text-gray-400 mt-1 text-sm">View and manage all registered customers</p>
                    </div>
                </div>

                {/* Stats */}
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
                        {/* Add other stats cards similarly if needed, simplifying for brevity but keeping core ones */}
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
                        <div className="mt-4 text-sm text-gray-400">
                            Showing {filteredCustomers.length} of {initialCustomers.length} customers
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <div className="hidden md:block">
                    <Card className="bg-[#1a2332] border-gray-800">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Customer</TableHead>
                                        <TableHead className="text-gray-400">Email</TableHead>
                                        <TableHead className="text-gray-400">Orders</TableHead>
                                        <TableHead className="text-gray-400">Total Spent</TableHead>
                                        <TableHead className="text-gray-400">Joined</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedCustomers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                                <p>No customers found</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedCustomers.map((customer) => (
                                            <TableRow key={customer.id} className="border-gray-800 hover:bg-gray-800/50">
                                                <TableCell>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                                                            <span className="text-blue-400 font-semibold">{customer.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{customer.name}</p>
                                                            <Badge variant="outline" className="border-gray-700 text-xs mt-1">
                                                                {(customer.totalOrders || 0) === 0 ? 'New' : 'Active'}
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
                                                        <span className="text-white font-semibold">{customer.totalOrders || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-green-400 font-semibold">{formatCurrency(customer.totalSpent || 0)}</span>
                                                </TableCell>
                                                <TableCell className="text-gray-400 text-sm">
                                                    {new Date(customer.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleViewCustomer(customer)} className="text-blue-400 hover:bg-blue-900/20">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomer(customer.id)} className="text-red-400 hover:bg-red-900/20" disabled={(customer.totalOrders || 0) > 0}>
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
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {paginatedCustomers.map(customer => (
                        <MobileCustomerCard key={customer.id} customer={customer} />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between py-4">
                        <div className="text-sm text-gray-400">Page {currentPage} of {totalPages}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="border-gray-700">Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="border-gray-700">Next</Button>
                        </div>
                    </div>
                )}

                {/* Dialogs */}
                <Dialog open={!!viewingCustomer} onOpenChange={closeViewDialog}>
                    <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Customer Details</DialogTitle>
                            <DialogDescription className="text-gray-400">{viewingCustomer?.name} - {viewingCustomer?.email}</DialogDescription>
                        </DialogHeader>
                        {detailsLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : customerDetails ? (
                            <div className="grid grid-cols-2 gap-4">
                                {/* Show detailed stats if available */}
                                <div className="bg-[#0f1419] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm">Total Spent</p>
                                    <p className="text-2xl font-bold text-green-400">{formatCurrency(customerDetails.statistics?.totalSpent || customerDetails.totalSpent || 0)}</p>
                                </div>
                                {/* More details... */}
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!deletingCustomerId} onOpenChange={closeDeleteDialog}>
                    <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={closeDeleteDialog} className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </div>
    );
}
