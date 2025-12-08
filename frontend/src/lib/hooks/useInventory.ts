import { useMemo } from 'react';
import { Product, Category } from '@/types';
import { useInventoryUIStore, StockFilter } from '@/lib/store/useInventoryUIStore';

interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  avgStockPerProduct: number;
  categoryBreakdown: Array<{
    id: number;
    name: string;
    productCount: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
  }>;
}

// Calculate inventory statistics
export function useInventoryStats(
  products: Product[],
  categories: Category[]
): InventoryStats {
  return useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
    const lowStockCount = products.filter((p) => p.stockLevel === 'LOW').length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;
    const avgStockPerProduct = totalProducts > 0 ? totalStock / totalProducts : 0;

    // Category breakdown
    const categoryBreakdown = categories
      .map((cat: Category) => {
        const categoryProducts = products.filter((p) => p.categoryId === cat.id);
        const categoryStock = categoryProducts.reduce((sum, p) => sum + p.stock, 0);
        const categoryValue = categoryProducts.reduce(
          (sum, p) => sum + p.stock * p.price,
          0
        );
        return {
          id: cat.id,
          name: cat.name,
          productCount: categoryProducts.length,
          totalStock: categoryStock,
          totalValue: categoryValue,
          lowStockCount: categoryProducts.filter((p) => p.stockLevel === 'LOW')
            .length,
        };
      })
      .filter((c) => c.productCount > 0);

    return {
      totalProducts,
      totalStock,
      totalValue,
      lowStockCount,
      outOfStockCount,
      avgStockPerProduct,
      categoryBreakdown,
    };
  }, [products, categories]);
}

// Filter and sort products based on store state
export function useFilteredProducts(products: Product[]): Product[] {
  const { searchQuery, categoryFilter, stockFilter, sortBy } = useInventoryUIStore();

  return useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.categoryId === parseInt(categoryFilter));
    }

    // Stock level filter
    if (stockFilter !== 'ALL') {
      if (stockFilter === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stock === 0);
      } else {
        result = result.filter((p) => p.stockLevel === stockFilter);
      }
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'stock-low':
        result.sort((a, b) => a.stock - b.stock);
        break;
      case 'stock-high':
        result.sort((a, b) => b.stock - a.stock);
        break;
    }

    return result;
  }, [products, searchQuery, categoryFilter, stockFilter, sortBy]);
}