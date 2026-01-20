'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order, OrderStats } from '@/lib/api/orders/orders.types';
import { DashboardStats } from '@/lib/api/analytics/analytics.types';
import { Product } from '@/lib/api/products/products.types';
import { useCompleteOrder, useRejectOrder } from '@/lib/api/orders/orders.hooks';
import { toast } from 'sonner';

interface AdminDashboardClientProps {
    stats: DashboardStats | null;
    recentOrders: Order[] | readonly Order[];
    orderStats: OrderStats | null;
    products: Product[] | readonly Product[];
}

export default function AdminDashboardClient({
    stats,
    recentOrders,
    orderStats,
    products
}: AdminDashboardClientProps) {
    const router = useRouter();
    const { data: session } = useSession(); // Used for greeting

    // Mutations
    const completeOrderMutation = useCompleteOrder();
    const rejectOrderMutation = useRejectOrder();

    const handleRefreshAll = () => {
        router.refresh();
        toast.success('Refreshing dashboard...');
    };

    const user = session?.user;

    // Safety check if session is missing but usually protected by Layout or Middleware
    if (!user) return null;

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
                                                    completeOrderMutation.mutate({ orderId: order.id }, {
                                                        onSuccess: () => router.refresh()
                                                    })
                                                }
                                                disabled={completeOrderMutation.isPending}
                                            >
                                                Complete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                                onClick={() =>
                                                    rejectOrderMutation.mutate({ orderId: order.id }, {
                                                        onSuccess: () => router.refresh()
                                                    })
                                                }
                                                disabled={rejectOrderMutation.isPending}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                    {order.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() =>
                                                    completeOrderMutation.mutate({ orderId: order.id }, {
                                                        onSuccess: () => router.refresh()
                                                    })
                                                }
                                                disabled={completeOrderMutation.isPending}
                                            >
                                                Complete (Manual)
                                            </Button>
                                        </div>
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
