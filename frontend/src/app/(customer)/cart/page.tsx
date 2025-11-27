"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/stores/cartStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, totalItems, totalAmount, syncWithBackend, isLoading } = useCartStore();

  // Sync cart on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    syncWithBackend();
  }, [isAuthenticated, syncWithBackend, router]);

  // Show loading state during initial sync
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
                  </AlertDescription>
                </Alert>
                
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </>
            )}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary
              totalItems={totalItems}
              totalAmount={totalAmount}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}