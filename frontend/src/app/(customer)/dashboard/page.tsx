"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, 
  Package, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Heart,
  Star,
  Zap
} from "lucide-react";

// Mock data - replace with real API calls
const mockStats = {
  totalOrders: 12,
  pendingOrders: 2,
  completedOrders: 10,
  favoriteItems: 5
};

const mockRecentOrders = [
  {
    id: 1,
    orderNumber: "ORD-2024-001",
    date: "2024-11-25",
    status: "COMPLETED",
    total: 45.99,
    items: 3
  },
  {
    id: 2,
    orderNumber: "ORD-2024-002",
    date: "2024-11-26",
    status: "PENDING",
    total: 32.50,
    items: 2
  },
  {
    id: 3,
    orderNumber: "ORD-2024-003",
    date: "2024-11-27",
    status: "PROCESSING",
    total: 78.25,
    items: 5
  }
];

const mockFeaturedProducts = [
  { id: 1, name: "Premium Headphones", price: 199.99, rating: 4.8, stock: 15 },
  { id: 2, name: "Wireless Mouse", price: 49.99, rating: 4.6, stock: 42 },
  { id: 3, name: "Mechanical Keyboard", price: 129.99, rating: 4.9, stock: 8 },
  { id: 4, name: "USB-C Hub", price: 39.99, rating: 4.5, stock: 23 }
];

export default function CustomerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-futuristic">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-glow-purple/40 rounded-full floating-particle blur-sm" />
        <div className="absolute top-40 right-20 w-3 h-3 bg-glow-magenta/30 rounded-full floating-particle blur-sm" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-glow-cyan/40 rounded-full floating-particle blur-sm" style={{ animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="glass-card p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, <span className="text-gradient">{user?.name}</span>! 👋
                </h1>
                <p className="text-gray-400 text-lg">
                  Here's what's happening with your account today
                </p>
              </div>
              <Button 
                size="lg"
                onClick={() => router.push("/products")}
                className="bg-linear-to-r from-glow-purple to-glow-magenta hover:opacity-90 transition-opacity btn-glow"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Start Shopping
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="glass-card glass-card-hover p-6 accent-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-linear-to-br from-glow-purple/20 to-glow-magenta/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-glow-purple" />
              </div>
              <Badge className="bg-glow-purple/10 text-glow-purple border-glow-purple/20">
                All time
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{mockStats.totalOrders}</h3>
            <p className="text-gray-400 text-sm">Total Orders</p>
          </div>

          {/* Pending Orders */}
          <div className="glass-card glass-card-hover p-6 accent-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-linear-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                Active
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{mockStats.pendingOrders}</h3>
            <p className="text-gray-400 text-sm">Pending Orders</p>
          </div>

          {/* Completed Orders */}
          <div className="glass-card glass-card-hover p-6 accent-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-linear-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                Success
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{mockStats.completedOrders}</h3>
            <p className="text-gray-400 text-sm">Completed Orders</p>
          </div>

          {/* Favorites */}
          <div className="glass-card glass-card-hover p-6 accent-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-linear-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <Badge className="bg-pink-500/10 text-pink-500 border-pink-500/20">
                Saved
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{mockStats.favoriteItems}</h3>
            <p className="text-gray-400 text-sm">Favorite Items</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-glow-purple/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">Recent Orders</CardTitle>
                    <CardDescription className="text-gray-400">
                      Your latest order activity
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/orders")}
                    className="border-glow-purple/30 hover:bg-glow-purple/10"
                  >
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentOrders.map((order) => (
                    <div 
                      key={order.id}
                      className="glass-card p-4 hover:bg-navy-light/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{order.orderNumber}</h4>
                          <p className="text-sm text-gray-400">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{order.items} items</span>
                        <span className="font-bold text-glow-purple">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <Card className="glass-card border-glow-purple/20">
              <CardHeader>
                <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  Shortcuts to common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-glow-purple/30 hover:bg-glow-purple/10"
                  onClick={() => router.push("/cart")}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View Cart
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-glow-cyan/30 hover:bg-glow-cyan/10"
                  onClick={() => router.push("/orders")}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Order History
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-glow-magenta/30 hover:bg-glow-magenta/10"
                  onClick={() => router.push("/products")}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Browse Products
                </Button>
              </CardContent>
            </Card>

            {/* Featured Products */}
            <Card className="glass-card border-glow-purple/20">
              <CardHeader>
                <CardTitle className="text-xl text-white">Featured for You</CardTitle>
                <CardDescription className="text-gray-400">
                  Recommended products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockFeaturedProducts.slice(0, 3).map((product) => (
                    <div 
                      key={product.id}
                      className="glass-card p-3 hover:bg-navy-light/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/products/${product.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white text-sm">{product.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs text-gray-400">{product.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-glow-purple">${product.price}</span>
                        <span className="text-xs text-gray-400">{product.stock} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}