// ============================================
// FILE: src/app/products/page.tsx (REFACTORED)
// ============================================
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/lib/hooks/useProducts'; // ✅ NEW
import { useCategories } from '@/lib/hooks/useCategories'; // ✅ NEW
import { useAddToCart } from '@/lib/hooks/useCart'; // ✅ ALREADY ADDED
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
  Search,
  Filter,
  ShoppingBag,
  Plus,
  Eye,
  Star,
  Heart,
  Grid3x3,
  List,
  SlidersHorizontal,
  TrendingUp,
  Package,
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { Product, Category } from '@/types';
import Image from 'next/image';

export default function ProductsPage() {
  // ===== ALL HOOKS AT THE TOP =====
  const router = useRouter();
  
  // ✅ React Query hooks (no manual queries!)
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: categoriesData } = useCategories();
  const addToCartMutation = useAddToCart();

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // ===== DERIVED STATE =====
  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === parseInt(selectedCategory));
    }

    // Price range filter
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      result = result.filter((p) => {
        if (max) return p.price >= min && p.price <= max;
        return p.price >= min;
      });
    }

    // Stock filter
    if (stockFilter !== 'all') {
      result = result.filter((p) => p.stockLevel === stockFilter);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'stock':
        result.sort((a, b) => b.stock - a.stock);
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy, priceRange, stockFilter]);

  // ===== EVENT HANDLERS =====
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('name');
    setPriceRange('all');
    setStockFilter('all');
  }, []);

  const handleAddToCart = useCallback(
    (productId: number) => {
      addToCartMutation.mutate({ productId, quantity: 1 });
    },
    [addToCartMutation]
  );

  const handleViewProduct = useCallback(
    (productId: number) => {
      router.push(`/products/${productId}`);
    },
    [router]
  );

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">Products</h1>
            <p className="text-gray-400 mt-1">Discover our amazing collection</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={
                viewMode === 'grid'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={
                viewMode === 'list'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-[#1a2332] border-gray-800 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products by name or description..."
                  className="pl-10 h-12 text-lg bg-[#0f1419] border-gray-700 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3">
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    <SelectItem value="all" className="text-gray-300">
                      All Categories
                    </SelectItem>
                    {categories.map((cat: Category) => (
                      <SelectItem key={cat.id} value={cat.id.toString()} className="text-gray-300">
                        {cat.name} ({cat.productCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    <SelectItem value="name" className="text-gray-300">
                      Name (A-Z)
                    </SelectItem>
                    <SelectItem value="price-low" className="text-gray-300">
                      Price (Low to High)
                    </SelectItem>
                    <SelectItem value="price-high" className="text-gray-300">
                      Price (High to Low)
                    </SelectItem>
                    <SelectItem value="stock" className="text-gray-300">
                      Stock (High to Low)
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Price Range */}
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Price Range" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    <SelectItem value="all" className="text-gray-300">
                      All Prices
                    </SelectItem>
                    <SelectItem value="0-10" className="text-gray-300">
                      $0 - $10
                    </SelectItem>
                    <SelectItem value="10-25" className="text-gray-300">
                      $10 - $25
                    </SelectItem>
                    <SelectItem value="25-50" className="text-gray-300">
                      $25 - $50
                    </SelectItem>
                    <SelectItem value="50" className="text-gray-300">
                      $50+
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Stock Filter */}
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <Package className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Stock Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    <SelectItem value="all" className="text-gray-300">
                      All Stock
                    </SelectItem>
                    <SelectItem value="HIGH" className="text-gray-300">
                      High Stock
                    </SelectItem>
                    <SelectItem value="MEDIUM" className="text-gray-300">
                      Medium Stock
                    </SelectItem>
                    <SelectItem value="LOW" className="text-gray-300">
                      Low Stock
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Reset Filters
                </Button>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-400">
                  Showing <span className="font-semibold text-white">{filteredProducts.length}</span> of{' '}
                  <span className="font-semibold text-white">{products.length}</span> products
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid/List */}
        {productsLoading ? (
          <div
            className={
              viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'
            }
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden bg-[#1a2332] border-gray-800">
                <Skeleton className="h-48 w-full bg-gray-800" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-800" />
                  <Skeleton className="h-3 w-1/2 bg-gray-800" />
                  <Skeleton className="h-8 w-full bg-gray-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="bg-[#1a2332] border-gray-800 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <ShoppingBag className="w-20 h-20 mx-auto text-gray-600" />
                <div>
                  <h3 className="text-xl font-semibold text-white">No products found</h3>
                  <p className="text-gray-400 mt-2">Try adjusting your filters or search query</p>
                </div>
                <Button onClick={resetFilters} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: Product) => (
              <Card
                key={product.id}
                className="group overflow-hidden bg-[#1a2332] border-gray-800 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
              >
                <div className="relative h-56 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-24 h-24 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 space-y-2">
                    <Badge className={`${getStockLevelColor(product.stockLevel)} border-0 shadow-lg`}>
                      {product.stockLevel}
                    </Badge>
                  </div>
                  <button className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-50">
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3
                      className="font-semibold text-lg line-clamp-1 text-white group-hover:text-blue-400 transition-colors cursor-pointer"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{product.category.name}</p>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
                  )}
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
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.stock === 0 || addToCartMutation.isPending}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewProduct(product.id)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product: Product) => (
              <Card
                key={product.id}
                className="group overflow-hidden bg-[#1a2332] border-gray-800 shadow-md hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="relative w-full md:w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 shrink-0">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-16 h-16 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3
                              className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors cursor-pointer"
                              onClick={() => handleViewProduct(product.id)}
                            >
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">{product.category.name}</p>
                          </div>
                          <Badge className={`${getStockLevelColor(product.stockLevel)} border-0`}>
                            {product.stockLevel}
                          </Badge>
                        </div>
                        {product.description && (
                          <p className="text-gray-400 line-clamp-2">{product.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-3xl font-bold text-blue-400">{formatCurrency(product.price)}</p>
                          <p className="text-sm text-gray-500 mt-1">{product.stock} in stock</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => handleAddToCart(product.id)}
                            disabled={product.stock === 0 || addToCartMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleViewProduct(product.id)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}