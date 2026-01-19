'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    ShoppingBag, ShoppingCart, Package, MessageCircle, Sparkles, ChevronRight,
    Plus, Eye, Star, Clock, CheckCircle, DollarSign, Zap,
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import type { Product } from '@/lib/api/products/products.types';
import type { Order } from '@/lib/api/orders/orders.types';
import type { CartSummary } from '@/lib/api/cart/cart.types';
import { useSession } from 'next-auth/react';
import { useAddToCart } from '@/lib/api/cart/cart.hooks';

// Product Card Component
const ProductCard = ({
    product,
    onAddToCart,
    onViewDetails,
}: {
    product: Product;
    onAddToCart: (id: number) => void;
    onViewDetails: (id: number) => void;
}) => (
    <Card className="group overflow-hidden bg-[#1a2332] border-gray-800 shadow-md hover:shadow-2xl transition-all">
        <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
            {product.image ? (
                <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-20 h-20 text-gray-600" />
                </div>
            )}
            <div className="absolute top-3 right-3">
                <Badge className={`${getStockLevelColor(product.stockLevel)} border-0 shadow-lg`}>
                    {product.stockLevel}
                </Badge>
            </div>
        </div>
        <CardContent className="p-4 space-y-3">
            <div>
                <h3 className="font-semibold text-lg line-clamp-1 text-white">{product.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-1">{product.category.name}</p>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-gray-500">{product.stock} in stock</p>
                </div>
                <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">4.8</span>
                </div>
            </div>
            <div className="flex space-x-2">
                <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => onAddToCart(product.id)}
                    disabled={product.stock === 0}
                >
                    <Plus className="w-4 h-4 mr-1" />Add
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewDetails(product.id)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                    <Eye className="w-4 h-4" />
                </Button>
            </div>
        </CardContent>
    </Card>
);

// Order Card Component
const OrderCard = ({
    order,
    onClick
}: {
    order: Order;
    onClick: (id: number) => void;
}) => {
    const statusColors = {
        COMPLETED: 'bg-green-500/20 text-green-400',
        PAID: 'bg-blue-500/20 text-blue-400',
        PENDING: 'bg-yellow-500/20 text-yellow-400',
        CANCELLED: 'bg-red-500/20 text-red-400',
    };

    return (
        <div
            className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-[#0f1419] hover:bg-gray-800/50 cursor-pointer transition-colors"
            onClick={() => onClick(order.id)}
        >
            <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusColors[order.status as keyof typeof statusColors] || statusColors.PENDING
                    }`}>
                    <Package className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-semibold text-white">{order.orderNumber}</p>
                    <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-white">{formatCurrency(order.totalAmount)}</p>
                <Badge className={statusColors[order.status as keyof typeof statusColors] || statusColors.PENDING}>
                    {order.status}
                </Badge>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    colorClass,
    onClick,
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    colorClass: string;
    onClick: () => void;
}) => (
    <Card
        className="bg-[#1a2332] border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
        onClick={onClick}
    >
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <p className="text-4xl font-bold text-white">{value}</p>
                    <p className="text-gray-400 text-xs">{subtitle}</p>
                </div>
                <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8" />
                </div>
            </div>
        </CardContent>
    </Card>
);

// Main Dashboard Client Component
export default function DashboardClient({
    cartData,
    ordersData,
    productsData,
}: {
    cartData: CartSummary | null;
    ordersData: Order[] | null;
    productsData: Product[] | null;
}) {
    const router = useRouter();
    const { data: session } = useSession();
    const addToCartMutation = useAddToCart();

    const stats = {
        cartItems: cartData?.totalItems || 0,
        cartAmount: cartData?.totalAmount || 0,
        pendingOrders: (ordersData || []).filter(o => o.status === 'PENDING').length,
        completedOrders: (ordersData || []).filter(o => o.status === 'COMPLETED').length,
        totalSpent: (ordersData || [])
            .filter(o => o.status === 'COMPLETED')
            .reduce((t, o) => t + o.totalAmount, 0),
        totalOrders: (ordersData || []).length,
    };

    const recentOrders = (ordersData || []).slice(0, 3);
    const featuredProducts = productsData || [];

    const handleAddToCart = useCallback((productId: number) => {
        addToCartMutation.mutate({
            productId,
            quantity: 1,
        });
    }, [addToCartMutation]);

    const handleViewProduct = useCallback((productId: number) => {
        router.push(`/products/${productId}`);
    }, [router]);

    const handleViewOrder = useCallback((orderId: number) => {
        router.push(`/orders/${orderId}`);
    }, [router]);

    const handleWhatsAppShop = useCallback(() => {
        const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
        if (!phone) {
            toast.error('WhatsApp support is not configured');
            return;
        }
        const userName = session?.user?.name || 'Customer';
        const msg = encodeURIComponent(`Hi! I'm ${userName} from eTuckshop.`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    }, [session?.user?.name]);

    const statCardsConfig = [
        {
            title: 'Cart Items',
            value: stats.cartItems,
            subtitle: formatCurrency(stats.cartAmount),
            colorClass: 'bg-blue-500/20 text-blue-400',
            icon: ShoppingCart,
            link: '/cart',
        },
        {
            title: 'Pending',
            value: stats.pendingOrders,
            subtitle: 'Orders awaiting',
            colorClass: 'bg-yellow-500/20 text-yellow-400',
            icon: Clock,
            link: '/orders?status=PENDING',
        },
        {
            title: 'Completed',
            value: stats.completedOrders,
            subtitle: 'Orders delivered',
            colorClass: 'bg-green-500/20 text-green-400',
            icon: CheckCircle,
            link: '/orders?status=COMPLETED',
        },
        {
            title: 'Total Spent',
            value: formatCurrency(stats.totalSpent).replace('$', ''),
            subtitle: `${stats.totalOrders} orders`,
            colorClass: 'bg-purple-500/20 text-purple-400',
            icon: DollarSign,
            link: '/orders',
        }
    ];

    const quickActions = [
        { title: 'Browse Products', subtitle: 'Explore catalog', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: ShoppingBag, link: '/products' },
        { title: 'View Cart', subtitle: `${stats.cartItems} items`, bgColor: 'bg-purple-500/20', textColor: 'text-purple-400', icon: ShoppingCart, link: '/cart' },
        { title: 'My Orders', subtitle: 'Track orders', bgColor: 'bg-green-500/20', textColor: 'text-green-400', icon: Package, link: '/orders' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-6 md:p-12 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -ml-48 -mb-48" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                            <span className="text-sm font-semibold uppercase tracking-wider">Welcome Back</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold">Hey, {session?.user?.name}! 👋</h1>
                        <p className="text-blue-100 text-base md:text-lg">Ready to discover amazing products today?</p>
                        <div className="flex flex-wrap gap-3 pt-4">
                            <Button
                                size="lg"
                                onClick={() => router.push('/products')}
                                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg"
                            >
                                <ShoppingBag className="w-5 h-5 mr-2" />Browse Products
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleWhatsAppShop}
                                className="border-2 border-white text-white hover:bg-white/10 font-semibold"
                            >
                                <MessageCircle className="w-5 h-5 mr-2" />Shop via WhatsApp
                            </Button>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="w-48 h-48 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
                            <ShoppingBag className="w-24 h-24 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCardsConfig.map((stat, idx) => (
                    <StatCard
                        key={idx}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                        icon={stat.icon}
                        colorClass={stat.colorClass}
                        onClick={() => router.push(stat.link)}
                    />
                ))}
            </div>

            {/* Featured Products */}
            <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
                <CardHeader className="border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl md:text-2xl text-white">Featured Products</CardTitle>
                                <p className="text-sm text-gray-400 mt-1">Handpicked for you</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => router.push('/products')} className="text-gray-300 hover:text-white hover:bg-gray-800">
                            View All<ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleAddToCart}
                                onViewDetails={handleViewProduct}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Orders & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
                    <CardHeader className="border-b border-gray-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Recent Orders</CardTitle>
                                    <p className="text-sm text-gray-400 mt-1">Latest purchases</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => router.push('/orders')} className="text-gray-300 hover:text-white hover:bg-gray-800">
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {recentOrders.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400">No orders yet</p>
                                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => router.push('/products')}>
                                    Start Shopping
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.map((order) => (
                                    <OrderCard key={order.id} order={order} onClick={handleViewOrder} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-[#1a2332] border-gray-800 shadow-xl">
                    <CardHeader className="border-b border-gray-800">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Quick Actions</CardTitle>
                                <p className="text-sm text-gray-400 mt-1">Navigate faster</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                        {quickActions.map((action, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="w-full justify-between h-auto p-4 border-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                                onClick={() => router.push(action.link)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                                        <action.icon className={`w-5 h-5 ${action.textColor}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold">{action.title}</p>
                                        <p className="text-xs text-gray-500">{action.subtitle}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        ))}
                        <Button
                            className="w-full h-auto p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                            onClick={handleWhatsAppShop}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-3">
                                    <MessageCircle className="w-5 h-5" />
                                    <div className="text-left">
                                        <p className="font-semibold">Shop via WhatsApp</p>
                                        <p className="text-xs text-green-100">Chat directly</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
