"use client";

import { use } from "react";
import { useProduct } from "@/lib/queries/useProductQueries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart, ArrowLeft } from "lucide-react";
import { formatPrice, getStockLevelText, getStockLevelColor } from "@/lib/utils/format";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id);
  const router = useRouter();
  const { toast } = useToast();
  
  const { data, isLoading, error } = useProduct(productId);
  const product = data?.data;

  const handleAddToCart = () => {
    if (product) {
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Product not found or failed to load.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const stockLevel = getStockLevelText(product.stock);
  const stockColorClass = getStockLevelColor(stockLevel);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
          <Image
            src="/images/placeholder.png"
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <Link 
              href={`/products/category/${product.categoryId}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {product.category.name}
            </Link>
            <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            <Badge className={stockColorClass}>
              {stockLevel} STOCK
            </Badge>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">
              {product.description || "No description available."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available Stock:</span>
              <span className="font-medium">{product.stock} units</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{product.category.name}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}