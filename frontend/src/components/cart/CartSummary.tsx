"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils/format";

interface CartSummaryProps {
  totalItems: number;
  totalAmount: number;
  isLoading?: boolean;
}

export function CartSummary({ totalItems, totalAmount, isLoading }: CartSummaryProps) {
  const router = useRouter();

  const shippingFee = 0; // Free shipping for now
  const tax = totalAmount * 0.15; // 15% tax
  const finalTotal = totalAmount + shippingFee + tax;

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
          <span className="font-medium">{formatPrice(totalAmount)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium text-green-600">FREE</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (15%)</span>
          <span className="font-medium">{formatPrice(tax)}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-xl">{formatPrice(finalTotal)}</span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push("/checkout")}
          disabled={isLoading || totalItems === 0}
        >
          Proceed to Checkout
        </Button>
      </CardFooter>
    </Card>
  );
}