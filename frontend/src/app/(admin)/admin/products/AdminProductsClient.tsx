'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download
} from 'lucide-react';
import { formatCurrency, getStockLevelColor } from '@/lib/utils';
import { Product, Category } from '@/lib/api/products/products.types';
import {
    createProduct,
    updateProduct,
    deleteProductAction,
    bulkDeleteProductsAction
} from '@/lib/api/products/products.actions';

type SortField = 'name' | 'price' | 'stock' | 'category';
type SortOrder = 'asc' | 'desc';

interface AdminProductsClientProps {
    initialProducts: readonly Product[];
    categories: Category[];
}

export default function AdminProductsClient({ initialProducts, categories }: AdminProductsClientProps) {
    const router = useRouter();
    const { data: session } = useSession();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [showBulkDelete, setShowBulkDelete] = useState(false);

    // Loading states
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        categoryId: '',
        image: ''
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Utility to get category name
    const getCategoryName = (catId: number) => {
        return categories.find(c => c.id === catId)?.name || 'Unknown';
    };

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
        if (!formData.name.trim()) errors.name = 'Product name is required';
        if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required';
        if (!formData.stock || parseInt(formData.stock) < 0) errors.stock = 'Valid stock quantity is required';
        if (!formData.categoryId) errors.categoryId = 'Category is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Actions
    const handleCreateProduct = async () => {
        if (!validateForm()) return;
        setIsCreating(true);

        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            categoryId: parseInt(formData.categoryId),
            image: formData.image.trim() || undefined
        };

        const res = await createProduct(payload);
        if (res.success) {
            toast.success('Product created');
            setIsCreateDialogOpen(false);
            resetForm();
            router.refresh(); // Refresh Data
        } else {
            toast.error(res.message);
        }
        setIsCreating(false);
    };

    const handleUpdateProduct = async () => {
        if (!editingProduct || !validateForm()) return;
        setIsUpdating(true);

        const payload = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            categoryId: parseInt(formData.categoryId),
            image: formData.image.trim() || undefined
        };

        const res = await updateProduct(editingProduct.id, payload);
        if (res.success) {
            toast.success('Product updated');
            setIsEditDialogOpen(false);
            setEditingProduct(null);
            resetForm();
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setIsUpdating(false);
    };

    const handleDeleteProduct = async () => {
        if (!deleteProductId) return;
        setIsDeleting(true);
        const res = await deleteProductAction(deleteProductId);
        if (res.success) {
            toast.success('Product deleted');
            setDeleteProductId(null);
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setIsDeleting(false);
    };

    const handleBulkDelete = async () => {
        if (selectedProducts.size === 0) return;
        setIsBulkDeleting(true);
        const res = await bulkDeleteProductsAction(Array.from(selectedProducts));
        if (res.success) {
            toast.success('Products deleted');
            setSelectedProducts(new Set());
            setShowBulkDelete(false);
            router.refresh();
        } else {
            toast.error(res.message);
        }
        setIsBulkDeleting(false);
    };

    // UI Handlers
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

    const handleSelectProduct = (id: number, checked: boolean) => {
        const newSelected = new Set(selectedProducts);
        if (checked) newSelected.add(id);
        else newSelected.delete(id);
        setSelectedProducts(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(new Set(filteredAndSortedProducts.map(p => p.id)));
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

    // Computed
    const filteredAndSortedProducts = useMemo(() => {
        // Create mutable copy
        let filtered = [...initialProducts].filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.categoryId.toString() === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        filtered.sort((a, b) => {
            let aVal: any = a[sortField as keyof Product];
            let bVal: any = b[sortField as keyof Product];

            // Handle category sort special case (using looked up name)
            if (sortField === 'category') {
                aVal = getCategoryName(a.categoryId).toLowerCase();
                bVal = getCategoryName(b.categoryId).toLowerCase();
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [initialProducts, searchQuery, selectedCategory, sortField, sortOrder, categories]);

    // Components
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
    };

    const ProductFormFields = () => (
        <>
            <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-[#0f1419] border-gray-700 text-white" />
                {formErrors.name && <p className="text-sm text-red-400">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-[#0f1419] border-gray-700 text-white min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="bg-[#0f1419] border-gray-700 text-white" />
                    {formErrors.price && <p className="text-sm text-red-400">{formErrors.price}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="stock">Stock *</Label>
                    <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="bg-[#0f1419] border-gray-700 text-white" />
                    {formErrors.stock && <p className="text-sm text-red-400">{formErrors.stock}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                        {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {formErrors.categoryId && <p className="text-sm text-red-400">{formErrors.categoryId}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input id="image" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="bg-[#0f1419] border-gray-700 text-white" />
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Products Management</h1>
                        <p className="text-gray-400 mt-1 text-sm">Manage inventory</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => router.refresh()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Refresh</span></Button>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Add</Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create Product</DialogTitle>
                                    <DialogDescription>Add new product</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4"><ProductFormFields /></div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-gray-700">Cancel</Button>
                                    <Button onClick={handleCreateProduct} className="bg-blue-600 hover:bg-blue-700" disabled={isCreating}>
                                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Bulk Delete */}
                {selectedProducts.size > 0 && (
                    <Alert className="bg-blue-900/20 border-blue-700">
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-blue-300">{selectedProducts.size} selected</span>
                            <Button size="sm" variant="destructive" onClick={() => setShowBulkDelete(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Filtering */}
                <Card className="bg-[#1a2332] border-gray-800">
                    <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-[#0f1419] border-gray-700 text-white" />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-[#0f1419] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Table (Desktop) */}
                <div className="hidden md:block">
                    <Card className="bg-[#1a2332] border-gray-800">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                                                onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                            />
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('name')} className="cursor-pointer text-gray-400"><div className="flex items-center">Product <SortIcon field="name" /></div></TableHead>
                                        <TableHead onClick={() => handleSort('category')} className="cursor-pointer text-gray-400"><div className="flex items-center">Category <SortIcon field="category" /></div></TableHead>
                                        <TableHead onClick={() => handleSort('price')} className="cursor-pointer text-gray-400"><div className="flex items-center">Price <SortIcon field="price" /></div></TableHead>
                                        <TableHead onClick={() => handleSort('stock')} className="cursor-pointer text-gray-400"><div className="flex items-center">Stock <SortIcon field="stock" /></div></TableHead>
                                        <TableHead className="text-right text-gray-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedProducts.map(product => (
                                        <TableRow key={product.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell><Checkbox checked={selectedProducts.has(product.id)} onCheckedChange={(checked) => handleSelectProduct(product.id, Boolean(checked))} /></TableCell>
                                            <TableCell className="font-medium text-white">
                                                <div className="flex items-center gap-3">
                                                    {product.image && <img src={product.image} className="w-8 h-8 rounded object-cover" />}
                                                    {product.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-300">{getCategoryName(product.categoryId)}</TableCell>
                                            <TableCell className="text-gray-300">{formatCurrency(product.price)}</TableCell>
                                            <TableCell>
                                                <Badge className={getStockLevelColor(product.stockLevel)}>{product.stock}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} className="text-blue-400 hover:bg-blue-900/20"><Edit className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteProductId(product.id)} className="text-red-400 hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Mobile view - Simplified, assuming users are likely admin on desktop, but keeping cards if needed */}
                <div className="md:hidden space-y-3">
                    {filteredAndSortedProducts.map(product => (
                        <Card key={product.id} className="bg-[#1a2332] border-gray-800">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-white">{product.name}</h3>
                                        <p className="text-sm text-gray-400">{getCategoryName(product.categoryId)}</p>
                                        <p className="font-bold text-blue-400 mt-1">{formatCurrency(product.price)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteProductId(product.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Dialogs */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4"><ProductFormFields /></div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-gray-700">Cancel</Button>
                            <Button onClick={handleUpdateProduct} className="bg-blue-600 hover:bg-blue-700" disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
                    <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
                        <AlertDialogHeader><DialogTitle>Delete Product?</DialogTitle><AlertDialogDescription className="text-gray-400">Irreversible action.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
                    <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
                        <AlertDialogHeader><DialogTitle>Bulk Delete?</DialogTitle><AlertDialogDescription className="text-gray-400">Delete {selectedProducts.size} products?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700" disabled={isBulkDeleting}>
                                {isBulkDeleting ? 'Deleting...' : 'Delete All'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </div>
    );
}
