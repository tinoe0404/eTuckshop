'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
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

// Import our optimized hooks and store
import {
  useCategories,
  useCategoryStats,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/hooks/useCategories';
import { useCategoryUIStore } from '@/lib/store/useCategoryUIStore';

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
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auth protection with useEffect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (session?.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin only.');
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  // UI Store (Zustand)
  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    deleteCategoryId,
    formData,
    editingCategory,
    searchQuery,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    setFormData,
    setSearchQuery,
  } = useCategoryUIStore();

  // Server State (React Query)
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: statsData, isLoading: statsLoading } = useCategoryStats();
  
  // Mutations with optimistic updates
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categories = categoriesData?.data || [];
  const stats: CategoryStats[] = statsData?.data || [];

  // Memoized filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((category: Category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  // Memoized totals
  const totals = useMemo(() => {
    return {
      totalCategories: categories.length,
      totalProducts: stats.reduce((sum, cat) => sum + cat.totalProducts, 0),
      totalStock: stats.reduce((sum, cat) => sum + cat.totalStock, 0),
      avgPrice: stats.length > 0
        ? stats.reduce((sum, cat) => sum + cat.averagePrice, 0) / stats.length
        : 0,
    };
  }, [categories, stats]);

  // Get category stats helper
  const getCategoryStats = (categoryId: number): CategoryStats | undefined => {
    return stats.find((s) => s.id === categoryId);
  };

  // Get category product count helper
  const getCategoryProductCount = (categoryId: number): number => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.productCount || 0;
  };

  // Handlers
  const handleCreateCategory = () => {
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      return; // Toast handled in mutation
    }

    const data: { name: string; description?: string } = {
      name: trimmedName,
    };

    const trimmedDesc = formData.description.trim();
    if (trimmedDesc) {
      data.description = trimmedDesc;
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        closeCreateDialog();
      },
    });
  };

  const handleEditClick = (category: Category) => {
    openEditDialog(category);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;

    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      return; // Toast handled in mutation
    }

    const data: { name?: string; description?: string } = {};
    
    if (trimmedName !== editingCategory.name) {
      data.name = trimmedName;
    }

    data.description = formData.description.trim() || undefined;

    updateMutation.mutate(
      {
        id: editingCategory.id,
        data,
      },
      {
        onSuccess: () => {
          closeEditDialog();
        },
      }
    );
  };

  const handleDeleteClick = (id: number) => {
    openDeleteDialog(id);
  };

  const confirmDelete = () => {
    if (deleteCategoryId) {
      deleteMutation.mutate(deleteCategoryId, {
        onSuccess: () => {
          closeDeleteDialog();
        },
      });
    }
  };

  /* =========================
     MOBILE CATEGORY CARD
  ========================= */
  const MobileCategoryCard = ({ category }: { category: Category }) => {
    const categoryStats = getCategoryStats(category.id);
    const productCount = getCategoryProductCount(category.id);
    
    return (
      <Card className="bg-[#1a2332] border-gray-800">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-lg">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center ml-3 flex-shrink-0">
                <FolderOpen className="w-6 h-6 text-blue-400" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1419] p-3 rounded-lg">
                <p className="text-xs text-gray-400">Products</p>
                <p className="text-lg font-bold text-white mt-1">
                  {categoryStats?.totalProducts || productCount}
                </p>
              </div>
              
              <div className="bg-[#0f1419] p-3 rounded-lg">
                <p className="text-xs text-gray-400">Total Stock</p>
                <p className="text-lg font-bold text-white mt-1">
                  {categoryStats?.totalStock || 0}
                </p>
              </div>
              
              <div className="bg-[#0f1419] p-3 rounded-lg">
                <p className="text-xs text-gray-400">Avg Price</p>
                <p className="text-lg font-bold text-blue-400 mt-1">
                  ${(categoryStats?.averagePrice || 0).toFixed(2)}
                </p>
              </div>
              
              <div className="bg-[#0f1419] p-3 rounded-lg">
                <p className="text-xs text-gray-400">Created</p>
                <p className="text-sm font-medium text-white mt-1">
                  {new Date(category.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditClick(category)}
                className="flex-1 border-gray-700 text-blue-400 hover:bg-blue-900/20"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteClick(category.id)}
                className="flex-1 border-gray-700 text-red-400 hover:bg-red-900/20"
                disabled={productCount > 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>

            {productCount > 0 && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Cannot delete (has products)
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Auth checks
  if (status === 'loading' || status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Loading state
  if (categoriesLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
    <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Categories Management</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Organize your products into categories
            </p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Categories</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totals.totalCategories}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Products</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totals.totalProducts}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Stock</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totals.totalStock}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Box className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Avg Price</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    ${totals.avgPrice.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardContent className="p-4 sm:p-6">
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

        {/* DESKTOP TABLE - Hidden on mobile */}
        <div className="hidden md:block">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
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
                                  onClick={() => handleEditClick(category)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(category.id)}
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MOBILE CARDS - Visible only on mobile */}
        <div className="md:hidden space-y-3">
          {filteredCategories.length === 0 ? (
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No categories found</p>
              </CardContent>
            </Card>
          ) : (
            filteredCategories.map((category: Category) => (
              <MobileCategoryCard key={category.id} category={category} />
            ))
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Category</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new category to organize your products
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Category Name *
                </Label>
                <Input
                  id="name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ name: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ description: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={closeCreateDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {createMutation.isPending ? (
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}>
          <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Category</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update category information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-300">
                  Category Name *
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ name: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-300">
                  Description (Optional)
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ description: e.target.value })
                  }
                  className="bg-[#0f1419] border-gray-700 text-white"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={closeEditDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCategory}
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {updateMutation.isPending ? (
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
          onOpenChange={(open) => {
            if (!open) closeDeleteDialog();
          }}
        >
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-[95vw] sm:max-w-md">
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
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                onClick={closeDeleteDialog}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteMutation.isPending ? (
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