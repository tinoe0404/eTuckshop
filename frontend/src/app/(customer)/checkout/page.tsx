'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
import { orderService } from '@/lib/api/services/order.service';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/lib/store/cartStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import {
  ShoppingCart,
  ArrowLeft,
  CreditCard,
  Wallet,
  CheckCircle,
  Clock,
  Package,
  User,
  Mail,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CartItem } from '@/types';
import Image from 'next/image';

type PaymentMethod = 'CASH' | 'PAYNOW' | null;

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
const user = session?.user;
  const { setTotalItems } = useCartStore();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch cart
  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (paymentType: 'CASH' | 'PAYNOW') =>
      orderService.checkout({ paymentType }),
    onSuccess: async (response) => {
      if (response.success) {
        toast.success('Order placed successfully!');
        setTotalItems(0);

        const { orderId, paymentType, nextStep } = response.data;

        if (paymentType === 'CASH') {
          // Redirect to generate QR code
          router.push(`/orders/${orderId}`);
        } else {
          // Redirect to PayNow payment
          router.push(`/orders/${orderId}`);
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });

  const cart = cartData?.data;
  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const totalAmount = cart?.totalAmount || 0;

  // Redirect if cart is empty
  useEffect(() => {
    if (!isLoading && items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/cart');
    }
  }, [items, isLoading, router]);

  const handlePlaceOrder = () => {
    if (!selectedPayment) {
      toast.error('Please select a payment method');
      return;
    }

    // Check stock availability
    const outOfStock = items.some((item: CartItem) => item.quantity > item.stock);
    if (outOfStock) {
      toast.error('Some items are out of stock. Please update your cart.');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmOrder = () => {
    if (selectedPayment) {
      checkoutMutation.mutate(selectedPayment);
      setShowConfirmDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/cart')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Checkout
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review your order and complete payment
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Cart</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
              <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-800 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Payment</p>
                  <p className="text-xs text-gray-500">Current</p>
                </div>
              </div>
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-500">Complete</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer Info & Payment Method */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      Pickup Location
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Show your QR code at the counter for quick pickup
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RadioGroup
                  value={selectedPayment || ''}
                  onValueChange={(value) => setSelectedPayment(value as PaymentMethod)}
                >
                  <div className="space-y-4">
                    {/* Cash Payment */}
                    <div
                      className={`relative flex items-start space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === 'CASH'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedPayment('CASH')}
                    >
                      <RadioGroupItem value="CASH" id="cash" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="cash" className="cursor-pointer">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                              <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">
                                Cash Payment
                              </p>
                              <p className="text-sm text-gray-500">Pay at counter</p>
                            </div>
                          </div>
                          <div className="space-y-2 ml-15 pl-0">
                            <div className="flex items-start space-x-2">
                              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                QR code expires in <strong>15 minute</strong>
                              </p>
                            </div>
                            <div className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Show QR at counter and pay cash
                              </p>
                            </div>
                            <div className="flex items-start space-x-2">
                              <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Collect items immediately after payment
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>

                    {/* PayNow Payment */}
                    <div
                      className={`relative flex items-start space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPayment === 'PAYNOW'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                      onClick={() => setSelectedPayment('PAYNOW')}
                    >
                      <RadioGroupItem value="PAYNOW" id="paynow" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="paynow" className="cursor-pointer">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">
                                PayNow
                              </p>
                              <p className="text-sm text-gray-500">Pay online now</p>
                            </div>
                          </div>
                          <div className="space-y-2 ml-15 pl-0">
                            <div className="flex items-start space-x-2">
                              <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Complete payment online
                              </p>
                            </div>
                            <div className="flex items-start space-x-2">
                              <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                QR code generated after payment
                              </p>
                            </div>
                            <div className="flex items-start space-x-2">
                              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                No expiry - collect anytime
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {!selectedPayment && (
                  <div className="mt-4 flex items-start space-x-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Please select a payment method to continue
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl sticky top-20">
              <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Items List */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Tax</span>
                    <span className="font-semibold">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Service Fee</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-lg">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-blue-600 text-2xl">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={!selectedPayment || checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="pt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Secure checkout process</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Package className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <span>QR code for quick pickup</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Your Order</AlertDialogTitle>

              {/* FIXED SECTION */}
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    You're about to place an order for{" "}
                    <strong>{totalItems} items</strong> with a total of{" "}
                    <strong>{formatCurrency(totalAmount)}</strong>.
                  </p>

                  <p>
                    Payment method:{" "}
                    <strong>
                      {selectedPayment === "CASH"
                        ? "Cash at Counter"
                        : "PayNow Online"}
                    </strong>
                  </p>

                  {selectedPayment === "CASH" && (
                    <p className="text-yellow-600 dark:text-yellow-400">
                      ⚠️ Your QR code will expire in 1 minute. Please proceed to the
                      counter immediately.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
              {/* END FIXED SECTION */}

            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmOrder}>
                Confirm Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}