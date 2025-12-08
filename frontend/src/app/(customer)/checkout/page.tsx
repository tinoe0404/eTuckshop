'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/lib/api/services/cart.service';
import { orderService } from '@/lib/api/services/order.service';
import { useAuthStore } from '@/lib/store/authStore';
import { useCartStore } from '@/lib/store/cartStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CartItem } from '@/types';
import Image from 'next/image';

type PaymentMethod = 'CASH' | 'PAYNOW';

// Separate component for better performance
const OrderItem = ({ item }: { item: CartItem }) => (
  <div className="flex items-center space-x-3">
    <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
      {item.image ? (
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
          sizes="64px"
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
    <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
      {formatCurrency(item.subtotal)}
    </p>
  </div>
);

// Memoized payment option component
const PaymentOption = ({
  type,
  icon: Icon,
  title,
  subtitle,
  gradient,
  features,
  selected,
  onSelect,
}: {
  type: PaymentMethod;
  icon: any;
  title: string;
  subtitle: string;
  gradient: string;
  features: { icon: any; text: string }[];
  selected: boolean;
  onSelect: (type: PaymentMethod) => void;
}) => (
  <div
    className={`relative flex items-start space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
      selected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-sm'
    }`}
    onClick={() => onSelect(type)}
  >
    <RadioGroupItem value={type} id={type.toLowerCase()} className="mt-1" />
    <div className="flex-1">
      <Label htmlFor={type.toLowerCase()} className="cursor-pointer">
        <div className="flex items-center space-x-3 mb-2">
          <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {title}
            </p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-2 ml-15 pl-0">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <feature.icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </Label>
    </div>
  </div>
);

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setTotalItems } = useCartStore();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Fetch cart with optimized config
  const { data: cartData, isLoading, error, isError } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Checkout mutation with optimistic updates
  const checkoutMutation = useMutation({
    mutationFn: (paymentType: PaymentMethod) =>
      orderService.checkout({ paymentType }),
    onMutate: async () => {
      // Optimistically update UI
      await queryClient.cancelQueries({ queryKey: ['cart'] });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Order placed successfully!');
        
        // Clear cart-related queries
        queryClient.setQueryData(['cart'], { data: { items: [], totalItems: 0, totalAmount: 0 } });
        queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        setTotalItems(0);

        const { orderId } = response.data;
        router.push(`/orders/${orderId}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place order');
      // Refetch cart to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Memoized cart data
  const { items, totalItems, totalAmount } = useMemo(() => {
    const cart = cartData?.data;
    return {
      items: cart?.items || [],
      totalItems: cart?.totalItems || 0,
      totalAmount: cart?.totalAmount || 0,
    };
  }, [cartData]);

  // Memoized stock validation
  const hasStockIssues = useMemo(
    () => items.some((item: CartItem) => item.quantity > item.stock),
    [items]
  );

  // Check authentication (runs once)
  useEffect(() => {
    if (!user && !isLoading) {
      toast.error('Please login to checkout');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Redirect if cart is empty (runs once)
  useEffect(() => {
    if (!isLoading && !isError && items.length === 0 && !hasRedirected) {
      setHasRedirected(true);
      toast.error('Your cart is empty');
      router.push('/cart');
    }
  }, [items.length, isLoading, isError, router, hasRedirected]);

  // Memoized callbacks
  const handlePlaceOrder = useCallback(() => {
    if (!selectedPayment) {
      toast.error('Please select a payment method');
      return;
    }

    if (hasStockIssues) {
      toast.error('Some items are out of stock. Please update your cart.');
      return;
    }

    setShowConfirmDialog(true);
  }, [selectedPayment, hasStockIssues]);

  const confirmOrder = useCallback(() => {
    if (selectedPayment) {
      checkoutMutation.mutate(selectedPayment);
      setShowConfirmDialog(false);
    }
  }, [selectedPayment, checkoutMutation]);

  const handlePaymentSelect = useCallback((type: PaymentMethod) => {
    setSelectedPayment(type);
  }, []);

  // Payment options configuration (memoized)
  const paymentOptions = useMemo(() => [
    {
      type: 'CASH' as PaymentMethod,
      icon: Wallet,
      title: 'Cash Payment',
      subtitle: 'Pay at counter',
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
      features: [
        { icon: Clock, text: 'QR code expires in 1 minute' },
        { icon: CheckCircle, text: 'Show QR at counter and pay cash' },
        { icon: Package, text: 'Collect items immediately after payment' },
      ],
    },
    {
      type: 'PAYNOW' as PaymentMethod,
      icon: CreditCard,
      title: 'PayNow',
      subtitle: 'Pay online now',
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      features: [
        { icon: CheckCircle, text: 'Complete payment online' },
        { icon: Package, text: 'QR code generated after payment' },
        { icon: Clock, text: 'No expiry - collect anytime' },
      ],
    },
  ], []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Failed to load checkout
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    There was an error loading your cart. Please try again.
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
                  >
                    Try Again
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/cart')}
                  >
                    Back to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
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
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Cart</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
              <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-800 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
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
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
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

            {/* Payment Method */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <RadioGroup
                  value={selectedPayment || ''}
                  onValueChange={handlePaymentSelect}
                >
                  <div className="space-y-4">
                    {paymentOptions.map((option) => (
                      <PaymentOption
                        key={option.type}
                        {...option}
                        selected={selectedPayment === option.type}
                        onSelect={handlePaymentSelect}
                      />
                    ))}
                  </div>
                </RadioGroup>

                {!selectedPayment && (
                  <div className="mt-4 flex items-start space-x-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
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
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item: CartItem) => (
                    <OrderItem key={item.id} item={item} />
                  ))}
                </div>

                <Separator />

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

                {hasStockIssues && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start space-x-2 text-red-700 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        Some items exceed available stock. Please update your cart.
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={!selectedPayment || checkoutMutation.isPending || hasStockIssues}
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
              <AlertDialogDescription className="space-y-3">
                <p>
                  You're about to place an order for{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>{' '}
                  with a total of{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(totalAmount)}
                  </span>
                  .
                </p>
                <p>
                  Payment method:{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedPayment === 'CASH' ? 'Cash at Counter' : 'PayNow Online'}
                  </span>
                </p>
                {selectedPayment === 'CASH' && (
                  <p className="text-yellow-600 dark:text-yellow-400 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Your QR code will expire in 1 minute. Please proceed to the counter
                      immediately.
                    </span>
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={checkoutMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmOrder} disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? (
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
    </div>
  );
}