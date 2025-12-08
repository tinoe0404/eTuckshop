'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Box,
  DollarSign,
  ShoppingBag,
  Filter,
  BarChart3,
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { Product, Category } from '@/types';

// Import optimized hooks and store
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import { useInventoryUIStore, StockFilter, SortBy } from '@/lib/store/useInventoryUIStore';
import { useInventoryStats, useFilteredProducts } from '@/lib/hooks/useInventory';

export default function AdminInventoryPage() {
  const router = useRouter();

  // UI Store (Zustand)
  const {
    searchQuery,
    categoryFilter,
    stockFilter,
    sortBy,
    setSearchQuery,
    setCategoryFilter,
    setStockFilter,
    setSortBy,
  } = useInventoryUIStore();

  // Server State (React Query)
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: categoriesData } = useCategories();

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  // Custom hooks for computed values
  const inventoryStats = useInventoryStats(products, categories);
  const filteredProducts = useFilteredProducts(products);

  // Loading state
  if (productsLoading) {
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
            <h1 className="text-3xl font-bold text-white">Inventory Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Monitor stock levels and product inventory
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/products')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Package className="w-4 h-4 mr-2" />
            Manage Products
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Total Products</p>
                  <p className="text-3xl font-bold text-white">
                    {inventoryStats.totalProducts}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: {inventoryStats.avgStockPerProduct.toFixed(1)} units/product
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Total Stock</p>
                  <p className="text-3xl font-bold text-white">
                    {inventoryStats.totalStock}
                  </p>
                  <p className="text-xs text-gray-500">Units in inventory</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Box className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Inventory Value</p>
                  <p className="text-3xl font-bold text-white">
                    ${inventoryStats.totalValue.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">Total stock value</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Low Stock Alert</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {inventoryStats.lowStockCount}
                  </p>
                  <p className="text-xs text-gray-500">
                    {inventoryStats.outOfStockCount} out of stock
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {(inventoryStats.lowStockCount > 0 || inventoryStats.outOfStockCount > 0) && (
          <Card className="bg-yellow-900/20 border-yellow-800">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-300 mb-2">
                    Inventory Alerts
                  </h3>
                  <div className="space-y-1 text-sm text-yellow-200">
                    {inventoryStats.outOfStockCount > 0 && (
                      <p>
                        ⚠️ <strong>{inventoryStats.outOfStockCount}</strong> products
                        are out of stock
                      </p>
                    )}
                    {inventoryStats.lowStockCount > 0 && (
                      <p>
                        📦 <strong>{inventoryStats.lowStockCount}</strong> products have
                        low stock levels
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 border-yellow-600 text-yellow-300 hover:bg-yellow-900/30"
                    onClick={() => setStockFilter('LOW')}
                  >
                    View Low Stock Products
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader className="border-b border-gray-800">
            <CardTitle className="flex items-center space-x-2 text-white">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <span>Inventory by Category</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryStats.categoryBreakdown.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => setCategoryFilter(cat.id.toString())}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white">{cat.name}</h4>
                    {cat.lowStockCount > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {cat.lowStockCount} low
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Products:</span>
                      <span className="text-white font-medium">{cat.productCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Stock:</span>
                      <span className="text-white font-medium">{cat.totalStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Value:</span>
                      <span className="text-blue-400 font-semibold">
                        ${cat.totalValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="all" className="hover:bg-gray-700">
                    All Categories
                  </SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                      className="hover:bg-gray-700"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Stock Level Filter */}
              <Select
                value={stockFilter}
                onValueChange={(value: StockFilter) => setStockFilter(value)}
              >
                <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Stock Level" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="ALL" className="hover:bg-gray-700">
                    All Stock
                  </SelectItem>
                  <SelectItem value="OUT_OF_STOCK" className="hover:bg-gray-700">
                    Out of Stock
                  </SelectItem>
                  <SelectItem value="LOW" className="hover:bg-gray-700">
                    Low Stock
                  </SelectItem>
                  <SelectItem value="MEDIUM" className="hover:bg-gray-700">
                    Medium Stock
                  </SelectItem>
                  <SelectItem value="HIGH" className="hover:bg-gray-700">
                    High Stock
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="name" className="hover:bg-gray-700">
                    Name (A-Z)
                  </SelectItem>
                  <SelectItem value="stock-low" className="hover:bg-gray-700">
                    Stock (Low to High)
                  </SelectItem>
                  <SelectItem value="stock-high" className="hover:bg-gray-700">
                    Stock (High to Low)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Product</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400">Stock</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Price</TableHead>
                  <TableHead className="text-gray-400">Stock Value</TableHead>
                  <TableHead className="text-gray-400 text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p>No products found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: Product) => {
                    const stockValue = product.stock * product.price;
                    return (
                      <TableRow
                        key={product.id}
                        className="border-gray-800 hover:bg-gray-800/50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center shrink-0">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-gray-400 line-clamp-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <Badge variant="outline" className="border-gray-700">
                            {product.category.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-2xl font-bold text-white">
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStockLevelColor(product.stockLevel)}>
                            {product.stockLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-blue-400 font-semibold">
                          {formatCurrency(product.price)}
                        </TableCell>
                        <TableCell className="text-purple-400 font-semibold">
                          {formatCurrency(stockValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.stock === 0 ? (
                            <span className="text-red-400 flex items-center justify-end space-x-1">
                              <TrendingDown className="w-4 h-4" />
                              <span className="text-xs">Out</span>
                            </span>
                          ) : product.stockLevel === 'LOW' ? (
                            <span className="text-yellow-400 flex items-center justify-end space-x-1">
                              <TrendingDown className="w-4 h-4" />
                              <span className="text-xs">Low</span>
                            </span>
                          ) : (
                            <span className="text-green-400 flex items-center justify-end space-x-1">
                              <TrendingUp className="w-4 h-4" />
                              <span className="text-xs">OK</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}