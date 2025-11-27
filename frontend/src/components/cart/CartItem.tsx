"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils/format";
import type { CartItem as CartItemType } from "@/types/cart.types";
import { useUpdateCartItem, useRemoveFromCart } from "@/lib/queries/useCartQueries";
import { useToast } from "@/hooks/use-toast";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { toast } = useToast();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCartItem();
  const { mutate: removeItem, isPending: isRemoving } = useRemoveFromCart();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > item.product.stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${item.product.stock} units available`,
      });
      return;
    }

    updateItem(
      { productId: item.productId, quantity: newQuantity },
      {
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.response?.data?.message || "Failed to update cart",
          });
        },
      }
    );
  };

  const handleRemove = () => {
    removeItem(item.productId, {
      onSuccess: () => {
        toast({
          title: "Removed from cart",
          description: `${item.product.name} has been removed from your cart.`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to remove item",
        });
      },
    });
  };

  const itemTotal = item.price * item.quantity;
  const isLoading = isUpdating || isRemoving;

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Image */}
        <Link href={`/products/${item.product.id}`} className="shrink-0">
          <div className="w-24 h-24 relative bg-muted rounded-md overflow-hidden">
            <Image
              src="/images/placeholder.png"
              alt={item.product.name}
              fill
              className="object-cover"
            />
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <Link href={`/products/${item.product.id}`}>
            <h3 className="font-semibold hover:text-primary line-clamp-1">
              {item.product.name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">
            {formatPrice(item.price)} each
          </p>
          
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isLoading || item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            <span className="w-12 text-center font-medium">
              {item.quantity}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isLoading || item.quantity >= item.product.stock}
            >
              <Plus className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-auto text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {item.quantity >= item.product.stock && (
            <p className="text-xs text-amber-600 mt-1">
              Maximum available quantity
            </p>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="font-bold text-lg">{formatPrice(itemTotal)}</p>
        </div>
      </div>
    </Card>
  );
}