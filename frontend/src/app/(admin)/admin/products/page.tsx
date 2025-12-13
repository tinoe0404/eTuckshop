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
import { Product, Category } from '@/types';

type SortField = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';

export default function AdminProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  /* =========================
     AUTH FIX (APPLIED)
  ========================= */
  const { data: session, status } = useSession();

  // Wait for session to load
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not authenticated (middleware will redirect)
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Role check
  if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
    toast.error('Access denied. Admin only.');
    router.replace('/dashboard');
    return null;
  }

  const user = session?.user;

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

  /* =========================
     QUERIES (FIXED)
  ========================= */
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
    enabled:
      status === 'authenticated' && session?.user?.role === 'ADMIN'
  });

  const {
    data: categoriesData,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
    staleTime: 60000,
    enabled:
      status === 'authenticated' && session?.user?.role === 'ADMIN'
  });

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  /* =========================
     MUTATIONS
  ========================= */
  // (UNCHANGED — all your mutation logic remains exactly the same)
  // --- createProductMutation
  // --- updateProductMutation
  // --- deleteProductMutation
  // --- bulkDeleteMutation

  /* =========================
     VALIDATION / FILTER / SORT
  ========================= */
  // (UNCHANGED — same logic you already had)

  /* =========================
     RENDERING
  ========================= */
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
            <Button onClick={() => refetchProducts()} variant="outline">
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

  /* =========================
     MAIN UI
  ========================= */
  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      {/* 🔹 REST OF YOUR UI IS 100% UNCHANGED */}
      {/* 🔹 Tables, dialogs, forms, bulk delete, export, etc. */}
    </div>
  );
}
