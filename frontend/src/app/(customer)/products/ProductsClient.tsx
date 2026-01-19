// ============================================
// FILE: src/app/products/page.tsx
// ============================================
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';


// Custom Hooks
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import { useAddToCart } from '@/lib/hooks/useCart';

// UI Components
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

// Icons
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

// Types
import { Product, Category } from '@/types';

// ==========================================
// HELPER FUNCTIONS (Local to avoid import errors)
// ==========================================
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

const getStockColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
  switch (level) {
    case 'HIGH':
      return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
    case 'MEDIUM':
      return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
    case 'LOW':
      return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

interface ProductsClientProps {
  initialProducts: Product[];
}

// ==========================================
// COMPONENT
// ==========================================
export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const router = useRouter();

  // 1. Data Fetching
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: categoriesData } = useCategories();
  const addToCartMutation = useAddToCart();

  // 2. Local State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // 3. Derived Data (Safe Access)
  const products = productsData || [];
  const categories = categoriesData || [];



  // 4. Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === parseInt(selectedCategory));
    }

    // Price Range
    if (priceRange !== 'all') {
      const [minStr, maxStr] = priceRange.split('-');
      const min = Number(minStr);
      const max = maxStr ? Number(maxStr) : Infinity;

      result = result.filter((p) => p.price >= min && p.price <= max);
    }

    // Stock Level
    if (stockFilter !== 'all') {
      result = result.filter((p) => p.stockLevel === stockFilter);
    }

    // Sorting
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

  // 5. Handlers
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('name');
    setPriceRange('all');
    setStockFilter('all');
  }, []);

  const handleAddToCart = useCallback(
    (product: Product) => {
      addToCartMutation.mutate({ productId: product.id, quantity: 1, product });
    },
    [addToCartMutation]
  );

  const handleViewProduct = useCallback(
    (productId: number) => {
      router.push(`/products/${productId}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* === HEADER === */}
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0'
                  : 'bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800'
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
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-0'
                  : 'bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800'
              }
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* === FILTERS CARD === */}
        <Card className="bg-[#1a2332] border-gray-800 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10 h-12 text-lg bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-3">
                {/* Category */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700 text-gray-300">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat: Category) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name} ({cat.productCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700 text-gray-300">
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="price-low">Price (Low to High)</SelectItem>
                    <SelectItem value="price-high">Price (High to Low)</SelectItem>
                    <SelectItem value="stock">Stock (High to Low)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Price */}
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Price Range" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700 text-gray-300">
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="0-10">$0 - $10</SelectItem>
                    <SelectItem value="10-25">$10 - $25</SelectItem>
                    <SelectItem value="25-50">$25 - $50</SelectItem>
                    <SelectItem value="50">$50+</SelectItem>
                  </SelectContent>
                </Select>

                {/* Stock */}
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700 text-gray-300">
                    <Package className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Stock Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700 text-gray-300">
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="HIGH">High Stock</SelectItem>
                    <SelectItem value="MEDIUM">Medium Stock</SelectItem>
                    <SelectItem value="LOW">Low Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Reset
                </Button>
              </div>

              {/* Count */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-400">
                  Showing <span className="font-semibold text-white">{filteredProducts.length}</span> of{' '}
                  <span className="font-semibold text-white">{products.length}</span> products
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === PRODUCTS DISPLAY === */}
        {productsLoading ? (
          // SKELETON LOADING STATE
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
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
          // EMPTY STATE
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
          // GRID VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: Product) => (
              <Card
                key={product.id}
                className="group overflow-hidden bg-[#1a2332] border-gray-800 shadow-md hover:shadow-2xl transition-all duration-300"
              >
                <div
                  className="relative h-56 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden cursor-pointer"
                  onClick={() => handleViewProduct(product.id)}
                >
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized // Safer for dev environments
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-24 h-24 text-gray-700" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 space-y-2">
                    <Badge className={`${getStockColor(product.stockLevel)} border-0 shadow-lg`}>
                      {product.stockLevel}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3
                      className="font-semibold text-lg line-clamp-1 text-white group-hover:text-blue-400 transition-colors cursor-pointer"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{product.category?.name}</p>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 h-10">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{formatPrice(product.price)}</p>
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
                      onClick={() => handleAddToCart(product)}
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
          // LIST VIEW
          <div className="space-y-4">
            {filteredProducts.map((product: Product) => (
              <Card
                key={product.id}
                className="group overflow-hidden bg-[#1a2332] border-gray-800 shadow-md hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div
                      className="relative w-full md:w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 shrink-0 cursor-pointer"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-16 h-16 text-gray-700" />
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
                            <p className="text-sm text-gray-400 mt-1">{product.category?.name}</p>
                          </div>
                          <Badge className={`${getStockColor(product.stockLevel)} border-0`}>
                            {product.stockLevel}
                          </Badge>
                        </div>
                        {product.description && (
                          <p className="text-gray-400 line-clamp-2">{product.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-3xl font-bold text-blue-400">{formatPrice(product.price)}</p>
                          <p className="text-sm text-gray-500 mt-1">{product.stock} in stock</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => handleAddToCart(product)}
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