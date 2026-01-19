'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
// ✅ FIXED: Use correct Product type from http-service
import { Product, Category } from '@/lib/http-service/products/types';

// ✅ FIXED: Use proper hooks instead of raw queries/mutations
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkDeleteProducts
} from '@/lib/api/products/products.hooks';

import { useCategories } from '@/lib/api/categories/categories.hooks';

type SortField = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';

export default function AdminProductsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  /* =========================
     STATE
  ========================= */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    image: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auth protection with useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin only.');
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  /* =========================
     ✅ FIXED: Use proper hooks
  ========================= */
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorData,
    refetch: refetchProducts
  } = useAdminProducts();

  const {
    data: categoriesData,
    refetch: refetchCategories
  } = useCategories();

  // ✅ FIXED: productsData IS the array (ProductListResponse = readonly Product[])
  const products = (productsData as unknown as Product[]) || [];
  const categories = (categoriesData as unknown as Category[]) || [];

  /* =========================
     ✅ FIXED: Use mutation hooks
  ========================= */
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const bulkDeleteMutation = useBulkDeleteProducts();

  /* =========================
     UTILITY FUNCTIONS
  ========================= */
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      categoryId: '',
      image: ''
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      errors.stock = 'Valid stock quantity is required';
    }

    if (!formData.categoryId) {
      errors.categoryId = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRefresh = () => {
    refetchProducts();
    refetchCategories();
    toast.success('Data refreshed');
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Category', 'Price', 'Stock', 'Status'],
      ...products.map((p: Product) => [
        p.name,
        p.category.name,
        p.price,
        p.stock,
        p.stockLevel
      ])
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Products exported');
  };

  /* =========================
     ✅ FIXED: Simplified handlers
  ========================= */
  const handleCreateProduct = () => {
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      categoryId: parseInt(formData.categoryId),
      image: formData.image.trim() || undefined
    };

    createProductMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      categoryId: product.categoryId.toString(),
      image: product.image || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      categoryId: parseInt(formData.categoryId),
      image: formData.image.trim() || undefined
    };

    updateProductMutation.mutate(
      { id: editingProduct.id, data: payload },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingProduct(null);
          resetForm();
        }
      }
    );
  };

  const handleSelectProduct = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(
        new Set(filteredAndSortedProducts.map((p: Product) => p.id))
      );
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedProducts), {
      onSuccess: () => {
        setSelectedProducts(new Set());
        setShowBulkDelete(false);
      }
    });
  };

  /* =========================
     COMPUTED VALUES
  ========================= */
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter((p: Product) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        p.categoryId.toString() === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a: Product, b: Product) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'stock':
          aVal = a.stock;
          bVal = b.stock;
          break;
        case 'category':
          aVal = a.category.name.toLowerCase();
          bVal = b.category.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, sortField, sortOrder]);

  /* =========================
     COMPONENTS
  ========================= */
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const ProductFormFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-[#0f1419] border-gray-700 text-white"
          placeholder="Enter product name"
        />
        {formErrors.name && (
          <p className="text-sm text-red-400">{formErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="bg-[#0f1419] border-gray-700 text-white min-h-[100px]"
          placeholder="Enter product description"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="bg-[#0f1419] border-gray-700 text-white"
            placeholder="0.00"
          />
          {formErrors.price && (
            <p className="text-sm text-red-400">{formErrors.price}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">Stock Quantity *</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            className="bg-[#0f1419] border-gray-700 text-white"
            placeholder="0"
          />
          {formErrors.stock && (
            <p className="text-sm text-red-400">{formErrors.stock}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) =>
            setFormData({ ...formData, categoryId: value })
          }
        >
          <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
            {categories.map((c: Category) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.categoryId && (
          <p className="text-sm text-red-400">{formErrors.categoryId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image URL</Label>
        <Input
          id="image"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="bg-[#0f1419] border-gray-700 text-white"
          placeholder="https://example.com/image.jpg"
        />
      </div>
    </>
  );

  /* =========================
     MOBILE PRODUCT CARD
  ========================= */
  const MobileProductCard = ({ product }: { product: Product }) => (
    <Card className="bg-[#1a2332] border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={selectedProducts.has(product.id)}
            onCheckedChange={(checked) =>
              handleSelectProduct(product.id, Boolean(checked))
            }
          />

          <div className="w-16 h-16 bg-gray-700 rounded flex-shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{product.name}</h3>
            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
              {product.description}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="border-gray-700 text-xs">
                {product.category.name}
              </Badge>
              <Badge className={getStockLevelColor(product.stockLevel) + " text-xs"}>
                {product.stockLevel}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-blue-400 font-bold">{formatCurrency(product.price)}</p>
                <p className="text-xs text-gray-400">Stock: {product.stock}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-blue-400 hover:bg-blue-900/20 h-8 w-8"
                  onClick={() => handleEditProduct(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-900/20 h-8 w-8"
                  onClick={() => setDeleteProductId(product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* =========================
     AUTH CHECKS
  ========================= */
  if (status === 'loading' || status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  /* =========================
     LOADING/ERROR STATES
  ========================= */
  if (productsLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
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

  if (productsError) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>
              {(productsErrorData as any)?.response?.data?.message || 'Try again'}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button onClick={() => refetchProducts()} variant="outline" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
            <Button onClick={() => router.push('/admin')} variant="ghost" className="flex-1 sm:flex-none">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     MAIN RENDER
  ========================= */
  return (
    <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Products Management</h1>
            <p className="text-gray-400 mt-1 text-sm">Manage inventory</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button onClick={handleExport} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Product</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Add new product
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <ProductFormFields />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-700 w-full sm:w-auto"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                    onClick={handleCreateProduct}
                    disabled={createProductMutation.isPending}
                  >
                    {createProductMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* BULK DELETE BANNER */}
        {selectedProducts.size > 0 && (
          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-blue-300">
                {selectedProducts.size} selected
              </span>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowBulkDelete(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* SEARCH + FILTER BAR */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="all">All Categories</SelectItem>

                  {categories.map((c: Category) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredAndSortedProducts.length} of {products.length} products
            </div>
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

                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedProducts.size === filteredAndSortedProducts.length &&
                            filteredAndSortedProducts.length > 0
                          }
                          onCheckedChange={(checked) =>
                            handleSelectAll(Boolean(checked))
                          }
                        />
                      </TableHead>

                      <TableHead
                        className="text-gray-400 cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Product <SortIcon field="name" />
                        </div>
                      </TableHead>

                      <TableHead
                        className="text-gray-400 cursor-pointer"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center">
                          Category <SortIcon field="category" />
                        </div>
                      </TableHead>

                      <TableHead
                        className="text-gray-400 cursor-pointer"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center">
                          Price <SortIcon field="price" />
                        </div>
                      </TableHead>

                      <TableHead
                        className="text-gray-400 cursor-pointer"
                        onClick={() => handleSort('stock')}
                      >
                        <div className="flex items-center">
                          Stock <SortIcon field="stock" />
                        </div>
                      </TableHead>

                      <TableHead className="text-gray-400">Status</TableHead>

                      <TableHead className="text-gray-400 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredAndSortedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-12 text-gray-400"
                        >
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                          <p>No products found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedProducts.map((p: Product) => (
                        <TableRow
                          key={p.id}
                          className="border-gray-800 hover:bg-gray-800/50"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(p.id)}
                              onCheckedChange={(checked) =>
                                handleSelectProduct(p.id, Boolean(checked))
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-gray-400" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="font-medium text-white">{p.name}</p>

                                {p.description && (
                                  <p className="text-xs text-gray-400 line-clamp-1">
                                    {p.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-gray-300">
                            <Badge variant="outline" className="border-gray-700">
                              {p.category.name}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-blue-400 font-semibold">
                            {formatCurrency(p.price)}
                          </TableCell>

                          <TableCell className="text-gray-300">{p.stock}</TableCell>

                          <TableCell>
                            <Badge className={getStockLevelColor(p.stockLevel)}>
                              {p.stockLevel}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-400 hover:bg-blue-900/20"
                                onClick={() => handleEditProduct(p)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:bg-red-900/20"
                                onClick={() => setDeleteProductId(p.id)}
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
            </CardContent>
          </Card>
        </div>

        {/* MOBILE CARDS - Visible only on mobile */}
        <div className="md:hidden space-y-3">
          {filteredAndSortedProducts.length === 0 ? (
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No products found</p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedProducts.map((product: Product) => (
              <MobileProductCard key={product.id} product={product} />
            ))
          )}
        </div>

        {/* EDIT DIALOG */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update product info
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <ProductFormFields />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="border-gray-700 w-full sm:w-auto"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                disabled={updateProductMutation.isPending}
                onClick={handleUpdateProduct}
              >
                {updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE SINGLE */}
        <AlertDialog open={deleteProductId !== null} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete product?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="border-gray-700 w-full sm:w-auto">Cancel</AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                disabled={deleteProductMutation.isPending}
                onClick={() =>
                  deleteProductId && deleteProductMutation.mutate(deleteProductId)
                }
              >
                {deleteProductMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* BULK DELETE */}
        <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedProducts.size} products?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="border-gray-700 w-full sm:w-auto">Cancel</AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                disabled={bulkDeleteMutation.isPending}
                onClick={handleBulkDelete}
              >
                {bulkDeleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting
                  </>
                ) : (
                  'Delete All'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
