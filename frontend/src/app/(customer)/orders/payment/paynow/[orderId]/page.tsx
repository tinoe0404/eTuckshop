'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ordersService } from '@/lib/api/orders/orders.client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api/client';

export default function PayNowPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const orderId = Number(params.orderId);
  const paymentRef = searchParams.get('ref');

  const [accountNumber, setAccountNumber] = useState('');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPaymentRef, setCurrentPaymentRef] = useState(paymentRef);

  // Fetch order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersService.getById(orderId),
  });

  // If no payment ref or invalid, get a fresh one
  useEffect(() => {
    const initializePayment = async () => {
      if (!paymentRef || !orderData?.data) return;

      // If order is pending and PayNow, but ref might be stale
      if (orderData.data.status === 'PENDING' && orderData.data.paymentType === 'PAYNOW') {
        try {
          // Get fresh payment info
          const response = await ordersService.initiatePayNow(orderId);
          if (response.success) {
            // Extract ref from URL
            const url = new URL(response.data.paymentUrl);
            const freshRef = url.searchParams.get('ref');
            if (freshRef && freshRef !== paymentRef) {
              console.log('🔄 Updating to fresh payment reference');
              setCurrentPaymentRef(freshRef);
            }
          }
        } catch (err) {
          console.error('Failed to get fresh payment ref:', err);
        }
      }
    };

    initializePayment();
  }, [orderId, paymentRef, orderData]);

  const order = orderData?.data;

  // Validate order
  useEffect(() => {
    if (!isLoading && order) {
      if (order.status === 'PAID') {
        router.push(`/orders/${orderId}?payment=already_paid`);
      } else if (order.status === 'COMPLETED') {
        router.push(`/orders/${orderId}`);
      } else if (order.paymentType !== 'PAYNOW') {
        router.push(`/orders/${orderId}`);
      }
    }
  }, [order, isLoading, orderId, router]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountNumber || accountNumber.length < 8) {
      setError('Please enter a valid account number (min 8 digits)');
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const response = await apiClient.get(
        `/orders/pay/paynow/process/${orderId}?ref=${currentPaymentRef || paymentRef}`
      );

      if (response.data.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/orders/${orderId}?payment=success`);
        }, 2000);
      } else {
        setError(response.data.message || 'Payment failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(
        err.response?.data?.message ||
        'Payment processing failed. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">
              The order you're trying to pay for doesn't exist.
            </p>
            <Button onClick={() => router.push('/orders')}>
              Go to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            PayNow Payment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete your payment securely
          </p>
        </div>

        {paymentSuccess ? (
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your payment has been processed. Redirecting to your order...
              </p>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center justify-between">
                  <span>Order Summary</span>
                  <Badge variant="outline" className="text-yellow-600">
                    Pending Payment
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Order Number</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Items</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {order.orderItems?.length || 0} items
                    </span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {order.orderItems?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.product?.name} × {item.quantity}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      Total Amount
                    </span>
                    <span className="text-3xl font-bold text-blue-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <CardTitle className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePayment} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="account">
                      Account Number
                      <span className="text-gray-500 text-xs ml-2">(Any 8+ digits for testing)</span>
                    </Label>
                    <Input
                      id="account"
                      type="text"
                      placeholder="12345678"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={12}
                      className="text-lg"
                      disabled={isProcessing}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pin">
                      PIN
                      <span className="text-gray-500 text-xs ml-2">(Any 4 digits for testing)</span>
                    </Label>
                    <Input
                      id="pin"
                      type="password"
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      maxLength={4}
                      className="text-lg text-center tracking-widest"
                      disabled={isProcessing}
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5 mr-2" />
                        Pay {formatCurrency(order.totalAmount)}
                      </>
                    )}
                  </Button>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                        <p className="font-semibold">🔒 Secure Test Environment</p>
                        <p className="text-xs">
                          This is a mock payment page for testing. No real charges will be made.
                          Use any account number (8+ digits) and PIN (4 digits) to simulate payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => router.push(`/orders/${orderId}`)}
                disabled={isProcessing}
                className="text-gray-600 hover:text-gray-900"
              >
                Cancel Payment
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}