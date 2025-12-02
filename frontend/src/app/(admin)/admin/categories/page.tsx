'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/lib/api/services/category.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  Package,
  Loader2,
  DollarSign,
  Box,
  AlertCircle,
} from 'lucide-react';
import { Category } from '@/types';

interface CategoryStats {
  id: number;
  name: string;
  description: string | null;
  totalProducts: number;
  totalStock: number;
  averagePrice: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAll,
  });

  // Fetch category stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['category-stats'],
    queryFn: categoryService.getStats,
  });

  const categories = categoriesData?.data || [];
  const stats: CategoryStats[] = statsData?.data || [];

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      categoryService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(response.message || 'Category created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create category';
      toast.error(message);
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      categoryService.update(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(response.message || 'Category updated successfully');
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update category';
      toast.error(message);
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-stats'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(response.message || 'Category deleted successfully');
      setDeleteCategoryId(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete category';
      toast.error(message);
    },
  });

  // Filter categories
  const filteredCategories = categories.filter((category: Category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals from stats
  const totalCategories = categories.length;
  const totalProducts = stats.reduce((sum, cat) => sum + cat.totalProducts, 0);
  const totalStock = stats.reduce((sum, cat) => sum + cat.totalStock, 0);
  const avgPrice = stats.length > 0
    ? stats.reduce((sum, cat) => sum + cat.averagePrice, 0) / stats.length
    : 0;

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleCreateCategory = () => {
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const data: { name: string; description?: string } = {
      name: trimmedName,
    };

    const trimmedDesc = formData.description.trim();
    if (trimmedDesc) {
      data.description = trimmedDesc;
    }

    createCategoryMutation.mutate(data);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;

    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    const data: { name?: string; description?: string } = {};
    
    // Only include name if it changed
    if (trimmedName !== editingCategory.name) {
      data.name = trimmedName;
    }

    // Always include description (can be empty string to clear)
    data.description = formData.description.trim() || undefined;

    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data,
    });
  };

  const handleDeleteCategory = (id: number) => {
    setDeleteCategoryId(id);
  };

  const confirmDelete = () => {
    if (deleteCategoryId) {
      deleteCategoryMutation.mutate(deleteCategoryId);
    }
  };

  // Get category stats for a specific category
  const getCategoryStats = (categoryId: number): CategoryStats | undefined => {
    return stats.find((s) => s.id === categoryId);
  };

  // Get category product count from categories data
  const getCategoryProductCount = (categoryId: number): number => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.productCount || 0;
  };

  if (categoriesLoading || statsLoading) {
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
              {[1, 2, 3, 4].map((i) => (
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
            <h1 className="text-3xl font-bold text-white">Categories Management</h1>
            <p className="text-gray-400 mt-1">
              Organize your products into categories
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Category</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add a new category to organize your products
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Category Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">
                    Category Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-[#0f1419] border-gray-700 text-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter category description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-[#0f1419] border-gray-700 text-white"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  disabled={createCategoryMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={createCategoryMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Category'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Total Categories</p>
                  <p className="text-3xl font-bold text-white">{totalCategories}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Total Products</p>
                  <p className="text-3xl font-bold text-white">{totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm font-medium">Total Stock</p>
                  <p className="text-3xl font-bold text-white">{totalStock}</p>
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
                  <p className="text-gray-400 text-sm font-medium">Avg Price</p>
                  <p className="text-3xl font-bold text-white">
                    ${avgPrice.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Showing {filteredCategories.length} of {categories.length} categories
            </div>
          </CardContent>
        </Card>

        {/* Categories Table */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400">Products</TableHead>
                  <TableHead className="text-gray-400">Total Stock</TableHead>
                  <TableHead className="text-gray-400">Avg Price</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-gray-400"
                    >
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p>No categories found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category: Category) => {
                    const categoryStats = getCategoryStats(category.id);
                    const productCount = getCategoryProductCount(category.id);
                    
                    return (
                      <TableRow
                        key={category.id}
                        className="border-gray-800 hover:bg-gray-800/50"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{category.name}</p>
                            {category.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-700 text-gray-300">
                            {categoryStats?.totalProducts || productCount} products
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {categoryStats?.totalStock || 0}
                        </TableCell>
                        <TableCell className="text-blue-400 font-semibold">
                          ${(categoryStats?.averagePrice || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {new Date(category.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCategory(category)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              disabled={productCount > 0}
                              title={productCount > 0 ? 'Cannot delete category with products' : 'Delete category'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Category</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update category information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Category Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-300">
                  Category Name *
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-300">
                  Description (Optional)
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingCategory(null);
                  resetForm();
                }}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={updateCategoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCategory}
                disabled={updateCategoryMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Category'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteCategoryId !== null}
          onOpenChange={() => setDeleteCategoryId(null)}
        >
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                <div className="space-y-2">
                  <p>This action cannot be undone. This will permanently delete the category.</p>
                  <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Note: You can only delete categories that have no products associated with them.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteCategoryMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}