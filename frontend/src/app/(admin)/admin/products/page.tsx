'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { productService } from '@/lib/api/services/product.service';
import { categoryService } from '@/lib/api/services/category.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, Loader2, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { Product, Category } from '@/types';

type SortField = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';

export default function AdminProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session } = useSession();
const user = session?.user;

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
    name: '', description: '', price: '', stock: '', categoryId: '', image: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // --------------------------
  // Auth + Access Restriction
  // --------------------------
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      toast.error('Access denied');
      router.push('/');
    }
  }, [user, router]);

  // --------------------------
  // Queries
  // --------------------------
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorData,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['admin-products'],
    queryFn: productService.getAll,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
    retry: 2,
    enabled: !!user && user.role === 'ADMIN'
  });

  const {
    data: categoriesData,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
    staleTime: 60000,
    enabled: !!user && user.role === 'ADMIN'
  });

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  // --------------------------
  // Mutations
  // --------------------------
  const createProductMutation = useMutation({
    mutationFn: productService.create,
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });

      const prev = queryClient.getQueryData(['admin-products']);

      queryClient.setQueryData(['admin-products'], (old: any) => ({
        ...old,
        data: [
          ...(old?.data || []),
          { ...newProduct, id: Date.now(), stockLevel: 'HIGH' }
        ]
      }));

      toast.loading('Creating...', { id: 'create' });

      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Created', { id: 'create' });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-products'], ctx.prev);
      toast.error(err.response?.data?.message || 'Failed', { id: 'create' });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });

      const prev = queryClient.getQueryData(['admin-products']);

      queryClient.setQueryData(['admin-products'], (old: any) => ({
        ...old,
        data: old?.data?.map((p: Product) =>
          p.id === id ? { ...p, ...data } : p
        )
      }));

      toast.loading('Updating...', { id: `u${id}` });

      return { prev, id };
    },
    onSuccess: (_, __, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Updated', { id: `u${ctx.id}` });

      setIsEditDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (err: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-products'], ctx.prev);
      toast.error(err.response?.data?.message || 'Failed', {
        id: `u${ctx.id}`
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: productService.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });

      const prev = queryClient.getQueryData(['admin-products']);

      queryClient.setQueryData(['admin-products'], (old: any) => ({
        ...old,
        data: old?.data?.filter((p: Product) => p.id !== id)
      }));

      toast.loading('Deleting...', { id: `d${id}` });

      return { prev, id };
    },
    onSuccess: (_, __, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Deleted', { id: `d${ctx.id}` });
      setDeleteProductId(null);
    },
    onError: (err: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-products'], ctx.prev);
      toast.error(err.response?.data?.message || 'Failed', {
        id: `d${ctx.id}`
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) =>
      Promise.all(ids.map((id) => productService.delete(id))),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });

      const prev = queryClient.getQueryData(['admin-products']);

      queryClient.setQueryData(['admin-products'], (old: any) => ({
        ...old,
        data: old?.data?.filter((p: Product) => !ids.includes(p.id))
      }));

      toast.loading(`Deleting ${ids.length}...`, { id: 'bulk' });

      return { prev };
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${ids.length} deleted`, { id: 'bulk' });
      setSelectedProducts(new Set());
      setShowBulkDelete(false);
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-products'], ctx.prev);
      toast.error('Failed', { id: 'bulk' });
    }
  });

  // --------------------------
  // Validation
  // --------------------------
  const validateForm = () => {
    const e: Record<string, string> = {};

    if (!formData.name.trim()) e.name = 'Required';
    if (!formData.price || parseFloat(formData.price) <= 0) e.price = 'Must be > 0';
    if (!formData.stock || parseInt(formData.stock) < 0) e.stock = 'Must be >= 0';
    if (!formData.categoryId) e.categoryId = 'Required';

    setFormErrors(e);

    return Object.keys(e).length === 0;
  };

  // --------------------------
  // Filtering + Sorting
  // --------------------------
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.categoryId === parseInt(selectedCategory));
    }

    result.sort((a, b) => {
      let compare = 0;

      switch (sortField) {
        case 'name':
          compare = a.name.localeCompare(b.name);
          break;
        case 'price':
          compare = a.price - b.price;
          break;
        case 'stock':
          compare = a.stock - b.stock;
          break;
        case 'category':
          compare = a.category.name.localeCompare(b.category.name);
          break;
      }

      return sortOrder === 'asc' ? compare : -compare;
    });

    return result;
  }, [products, searchQuery, selectedCategory, sortField, sortOrder]);

  // --------------------------
  // Helpers
  // --------------------------
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCreateProduct = () => {
    if (!validateForm()) return;

    createProductMutation.mutate({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      categoryId: parseInt(formData.categoryId),
      image: formData.image || undefined
    });
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);

    setFormData({
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      stock: p.stock.toString(),
      categoryId: p.categoryId.toString(),
      image: p.image || ''
    });

    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !validateForm()) return;

    updateProductMutation.mutate({
      id: editingProduct.id,
      data: {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        categoryId: parseInt(formData.categoryId),
        image: formData.image || undefined
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredAndSortedProducts.map((p) => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (id: number, checked: boolean) => {
    const newSet = new Set(selectedProducts);

    if (checked) newSet.add(id);
    else newSet.delete(id);

    setSelectedProducts(newSet);
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Category', 'Price', 'Stock', 'Level'],
      ...filteredAndSortedProducts.map((p) => [
        p.id,
        p.name,
        p.category.name,
        p.price,
        p.stock,
        p.stockLevel
      ])
    ]
      .map((r) => r.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);

    toast.success('Exported!');
  };

  const handleRefresh = () =>
    toast.promise(
      Promise.all([refetchProducts(), refetchCategories()]),
      {
        loading: 'Refreshing...',
        success: 'Refreshed!',
        error: 'Failed'
      }
    );

  // --------------------------
  // Rendering
  // --------------------------
  if (!user || user.role !== 'ADMIN') return null;

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-6">
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
      <div className="min-h-screen bg-[#0f1419] p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>
              {(productsErrorData as any)?.response?.data?.message || 'Try again'}
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
            <Button onClick={() => router.push('/admin')} variant="ghost">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------
  // Icons
  // --------------------------
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-500" />;
    }

    return sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-400" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-400" />;
  };

  // --------------------------
  // Form Fields
  // --------------------------
  const ProductFormFields = () => (
    <>
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-gray-300">Name *</Label>
        <Input
          value={formData.name}
          className="bg-[#0f1419] border-gray-700 text-white"
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        {formErrors.name && (
          <p className="text-xs text-red-400">{formErrors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-gray-300">Description</Label>
        <Textarea
          rows={3}
          value={formData.description}
          className="bg-[#0f1419] border-gray-700 text-white"
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      {/* Price + Stock */}
      <div className="grid grid-cols-2 gap-4">
        {/* Price */}
        <div className="space-y-2">
          <Label className="text-gray-300">Price *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            className="bg-[#0f1419] border-gray-700 text-white"
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
          />
          {formErrors.price && (
            <p className="text-xs text-red-400">{formErrors.price}</p>
          )}
        </div>

        {/* Stock */}
        <div className="space-y-2">
          <Label className="text-gray-300">Stock *</Label>
          <Input
            type="number"
            value={formData.stock}
            className="bg-[#0f1419] border-gray-700 text-white"
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
          />
          {formErrors.stock && (
            <p className="text-xs text-red-400">{formErrors.stock}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-gray-300">Category *</Label>

        <Select
          value={formData.categoryId}
          onValueChange={(v) =>
            setFormData({ ...formData, categoryId: v })
          }
        >
          <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white">
            <SelectValue placeholder="Select" />
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
          <p className="text-xs text-red-400">{formErrors.categoryId}</p>
        )}
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label className="text-gray-300">Image URL</Label>
        <Input
          value={formData.image}
          className="bg-[#0f1419] border-gray-700 text-white"
          onChange={(e) =>
            setFormData({ ...formData, image: e.target.value })
          }
        />
      </div>
    </>
  );

  // --------------------------
  // Main UI
  // --------------------------
  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Products Management</h1>
            <p className="text-gray-400 mt-1">Manage inventory</p>
          </div>

          <div className="flex gap-2">
            {/* Refresh */}
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>

            {/* Export */}
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </DialogTrigger>

              <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Product</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Add new product
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <ProductFormFields />
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    className="border-gray-700"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
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
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-300">
                {selectedProducts.size} selected
              </span>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowBulkDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* SEARCH + FILTER BAR */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[200px] bg-[#0f1419] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                  <SelectItem value="all">All</SelectItem>

                  {categories.map((c: Category) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredAndSortedProducts.length} of {products.length}
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-0">
            <Table>

              {/* Table Header */}
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  
                  {/* Select All */}
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

                  {/* Product Column */}
                  <TableHead
                    className="text-gray-400 cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Product <SortIcon field="name" />
                    </div>
                  </TableHead>

                  {/* Category */}
                  <TableHead
                    className="text-gray-400 cursor-pointer"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category <SortIcon field="category" />
                    </div>
                  </TableHead>

                  {/* Price */}
                  <TableHead
                    className="text-gray-400 cursor-pointer"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      Price <SortIcon field="price" />
                    </div>
                  </TableHead>

                  {/* Stock */}
                  <TableHead
                    className="text-gray-400 cursor-pointer"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center">
                      Stock <SortIcon field="stock" />
                    </div>
                  </TableHead>

                  {/* Stock Level */}
                  <TableHead className="text-gray-400">Status</TableHead>

                  {/* Actions */}
                  <TableHead className="text-gray-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
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
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(p.id)}
                          onCheckedChange={(checked) =>
                            handleSelectProduct(p.id, Boolean(checked))
                          }
                        />
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
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

                          <div>
                            <p className="font-medium text-white">{p.name}</p>

                            {p.description && (
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-gray-300">
                        <Badge variant="outline" className="border-gray-700">
                          {p.category.name}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-blue-400 font-semibold">
                        {formatCurrency(p.price)}
                      </TableCell>

                      {/* Stock */}
                      <TableCell className="text-gray-300">{p.stock}</TableCell>

                      {/* Stock Level */}
                      <TableCell>
                        <Badge className={getStockLevelColor(p.stockLevel)}>
                          {p.stockLevel}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-400 hover:bg-blue-900/20"
                            onClick={() => handleEditProduct(p)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Delete */}
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
          </CardContent>
        </Card>

        {/* EDIT dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update product info
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <ProductFormFields />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="border-gray-700"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-600 hover:bg-blue-700"
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

        {/* DELETE single */}
        <AlertDialog open={deleteProductId !== null} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete product?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
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
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedProducts.size} products?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={bulkDeleteMutation.isPending}
                onClick={() =>
                  bulkDeleteMutation.mutate(Array.from(selectedProducts))
                }
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
