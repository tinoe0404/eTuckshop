'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
import { orderService } from '@/lib/api/services/order.service';
import { useAuthStore } from '@/lib/store/authStore';
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
  CreditCard,
  Wallet,
  ArrowLeft,
  Lock,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  User,
  Mail,
  Phone,
  Loader2,
  QrCode,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CartItem } from '@/types';
import Image from 'next/image';

type PaymentMethod = 'CASH' | 'PAYNOW' | null;

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTotalItems } = useCartStore();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch cart
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: (paymentType: 'CASH' | 'PAYNOW') =>
      orderService.checkout({ paymentType }),
    onSuccess: async (response) => {
      setIsProcessing(false);
      
      if (response.success) {
        const { data } = response;
        
        // Clear cart in store
        setTotalItems(0);
        
        // Show success message
        toast.success('Order placed successfully!');

        // Handle based on payment type
        if (data.paymentType === 'CASH') {
          // Redirect to generate QR page
          router.push(`/orders/${data.orderId}`);
        } else {
          // PayNow - redirect to payment URL
          if (data.nextStep?.url) {
            window.location.href = data.nextStep.url;
          } else {
            router.push(`/orders/${data.orderId}`);
          }
        }
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast.error(error.response?.data?.message || 'Failed to place order');
    },
  });

  const cart = cartData?.data;
  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const totalAmount = cart?.totalAmount || 0;

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/cart');
    }
  }, [cartLoading, items.length, router]);

  const handlePlaceOrder = () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmOrder = () => {
    if (!paymentMethod) return;

    setShowConfirmDialog(false);
    setIsProcessing(true);
    placeOrderMutation.mutate(paymentMethod);
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.email}
                      </p>
                    </div>
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
                  value={paymentMethod || ''}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                >
                  <div className="space-y-4">
                    {/* Cash Payment Option */}
                    <div
                      className={`relative flex items-start space-x-4 p-6 rounded-xl border-2 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        paymentMethod === 'CASH'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setPaymentMethod('CASH')}
                    >
                      <RadioGroupItem value="CASH" id="cash" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Label
                            htmlFor="cash"
                            className="text-lg font-semibold cursor-pointer flex items-center space-x-2"
                          >
                            <Wallet className="w-5 h-5 text-green-600" />
                            <span>Cash Payment</span>
                          </Label>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Pay at Counter
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Pay with cash when you collect your order at the counter.
                        </p>
                        <div className="flex items-start space-x-2 text-sm">
                          <QrCode className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Get instant QR code</strong> - Show it at the counter for
                            quick collection (expires in 2 minutes)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PayNow Payment Option */}
                    <div
                      className={`relative flex items-start space-x-4 p-6 rounded-xl border-2 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        paymentMethod === 'PAYNOW'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => setPaymentMethod('PAYNOW')}
                    >
                      <RadioGroupItem value="PAYNOW" id="paynow" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Label
                            htmlFor="paynow"
                            className="text-lg font-semibold cursor-pointer flex items-center space-x-2"
                          >
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <span>PayNow</span>
                          </Label>
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Online Payment
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Pay online securely before collecting your order.
                        </p>
                        <div className="flex items-start space-x-2 text-sm">
                          <Lock className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Secure payment</strong> - Get QR code after successful
                            payment confirmation
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {/* Payment Method Info */}
                {paymentMethod && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                          {paymentMethod === 'CASH'
                            ? 'Cash Payment Instructions'
                            : 'PayNow Instructions'}
                        </p>
                        <p className="text-blue-700 dark:text-blue-400">
                          {paymentMethod === 'CASH'
                            ? 'After placing your order, you will receive a QR code valid for 2 minutes. Show this QR code at the counter and pay with cash to collect your items.'
                            : 'After placing your order, you will be redirected to complete the payment online. Once payment is confirmed, you will receive a QR code to show at the counter for collection.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items Review */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span>Order Items</span>
                  </span>
                  <Badge variant="secondary">{totalItems} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {items.map((item: CartItem) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Product Image */}
                      <div className="relative w-16 h-16 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden shrink-0">
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

                      {/* Product Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.category.name} • Qty: {item.quantity}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-bold text-blue-600">
                          {formatCurrency(item.subtotal)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.price)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl sticky top-20">
              <CardHeader className="border-b bg-linear-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Summary Details */}
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
                    <span>Delivery</span>
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
                  disabled={!paymentMethod || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>

                {/* Security Badge */}
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Lock className="w-4 h-4" />
                  <span>Secure checkout</span>
                </div>

                {/* Additional Info */}
                <Separator />

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Free pickup at counter</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <span>
                      {paymentMethod === 'CASH'
                        ? 'QR code valid for 2 minutes'
                        : 'Instant QR after payment'}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <QrCode className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                    <span>Show QR code at counter to collect</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <span>Confirm Your Order</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Method:</span>
                    <span className="font-semibold">
                      {paymentMethod === 'CASH' ? '💵 Cash' : '💳 PayNow'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Items:</span>
                    <span className="font-semibold">{totalItems} items</span>
                  </div>
                </div>
              </div>
              <p className="text-sm">
                {paymentMethod === 'CASH'
                  ? 'After confirming, you will receive a QR code valid for 2 minutes. Show it at the counter and pay with cash.'
                  : 'After confirming, you will be redirected to complete payment online. Your QR code will be generated after successful payment.'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmOrder}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Order'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}