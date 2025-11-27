"use client";

import { useState } from "react";
import { useProducts } from "@/lib/queries/useProductQueries";
import { useCategories } from "@/lib/queries/useCategoryQueries";
import { ProductGrid } from "@/components/products/ProductGrid";
import { CategoryList } from "@/components/categories/CategoryList";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types/product.types";

export default function HomePage() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  
  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts({
    categoryId: selectedCategory,
  });
  
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  const handleAddToCart = (product: Product) => {
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-20">
            <h2 className="font-bold text-lg mb-4">Categories</h2>
            {categoriesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <CategoryList
                categories={categoriesData?.data || []}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
              />
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              {selectedCategory 
                ? categoriesData?.data?.find(c => c.id === selectedCategory)?.name
                : "All Products"
              }
            </h1>
            <p className="text-muted-foreground mt-1">
              {productsData?.data?.length || 0} products available
            </p>
          </div>

          {productsError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load products. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <ProductGrid
              products={productsData?.data || []}
              onAddToCart={handleAddToCart}
            />
          )}
        </div>
      </div>
    </div>
  );
}