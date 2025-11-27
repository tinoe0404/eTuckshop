"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getStockLevelText, getStockLevelColor } from "@/lib/utils/format";
import type { Product } from "@/types/product.types";
import { useAddToCart } from "@/lib/queries/useCartQueries";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { mutate: addToCart, isPending } = useAddToCart();
  
  const stockLevel = getStockLevelText(product.stock);
  const stockColorClass = getStockLevelColor(stockLevel);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    addToCart(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          toast({
            title: "Added to cart",
            description: `${product.name} has been added to your cart.`,
          });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description:
                  error?.response?.data?.message || "Failed to add item to cart",
              });
        },
      }
    );
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square relative bg-muted overflow-hidden">
          <Image
            src="/images/placeholder.png"
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
          {product.stock <= 5 && (
            <Badge className={`absolute top-2 right-2 ${stockColorClass}`}>
              {stockLevel}
            </Badge>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold line-clamp-1 hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xl font-bold">{formatPrice(product.price)}</span>
          <span className="text-sm text-muted-foreground">
            {product.stock} in stock
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          disabled={product.stock === 0 || isPending}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending ? "Adding..." : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}