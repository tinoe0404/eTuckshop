'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  Download,
  RefreshCw,
  User,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
// Image component removed - using regular img tags

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Fetch order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId),
    refetchInterval: (data) => {
      // Auto-refresh every 5 seconds for pending/paid orders
      const order = data?.data;
      if (order && ['PENDING', 'PAID'].includes(order.status)) {
        return 5000;
      }
      return false;
    },
  });

  // Generate QR for CASH orders
  const generateQRMutation = useMutation({
    mutationFn: () => orderService.generateCashQR(orderId),
    onSuccess: (response) => {
      if (response.success) {
        setQrCodeUrl(response.data.qrCode);
        toast.success('QR code generated successfully!');
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: () => orderService.cancelOrder(orderId),
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });

  const order = orderData?.data;

  // Countdown timer for CASH QR expiry
  useEffect(() => {
    if (!order || !qrCodeUrl || order.paymentType !== 'CASH') return;

    const expiresAt = order.paymentQR?.expiresAt;
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order, qrCodeUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PAID':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5" />;
      case 'PAID':
        return <CreditCard className="w-5 h-5" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const handleGenerateQR = () => {
    generateQRMutation.mutate();
  };

  const handlePayNow = () => {
    // Initiate PayNow payment
    orderService.initiatePayNow(orderId).then((response) => {
      if (response.success && response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      }
    });
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `order-${order?.orderNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order not found</h2>
          <Button onClick={() => router.push('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const isQRExpired = timeLeft === 0;
  const canGenerateQR = order.status === 'PENDING' && order.paymentType === 'CASH';
  const needsPayment = order.status === 'PENDING' && order.paymentType === 'PAYNOW';
  const hasActiveQR = ['PAID', 'COMPLETED'].includes(order.status) || (qrCodeUrl && !isQRExpired);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/orders')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
        </div>

        {/* Order Header */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {order.orderNumber}
                  </h1>
                  <Badge className={`${getStatusColor(order.status)} gap-1`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {order.paymentType === 'CASH' ? (
                      <Wallet className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>{order.paymentType}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold text-lg text-blue-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
              {order.status === 'PENDING' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your order and restore the stock. This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Order</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelOrderMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={cancelOrderMutation.isPending}
                      >
                        {cancelOrderMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel Order'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: QR Code & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* QR Code Card */}
            {order.status !== 'CANCELLED' && (
              <Card className="border-0 shadow-xl">
                <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <CardTitle className="flex items-center space-x-2">
                    <QrCode className="w-6 h-6" />
                    <span>
                      {needsPayment
                        ? 'Complete Payment'
                        : canGenerateQR
                        ? 'Generate QR Code'
                        : 'QR Code for Pickup'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Need Payment (PayNow) */}
                  {needsPayment && (
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                        <CreditCard className="w-12 h-12 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Complete Payment</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Click below to complete your PayNow payment. Your QR code will be
                          generated after successful payment.
                        </p>
                      </div>
                      <Button size="lg" onClick={handlePayNow} className="gap-2">
                        <CreditCard className="w-5 h-5" />
                        Pay Now - {formatCurrency(order.totalAmount)}
                      </Button>
                    </div>
                  )}

                  {/* Generate QR (Cash - not yet generated) */}
                  {canGenerateQR && !qrCodeUrl && (
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                        <Wallet className="w-12 h-12 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Ready to Generate QR</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Click below to generate your QR code. Show it at the counter and pay
                          with cash.
                        </p>
                        <div className="flex items-start space-x-2 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                          <p>
                            <strong>Important:</strong> Your QR code will expire in 2 minutes.
                            Generate it when you're ready to go to the counter.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        onClick={handleGenerateQR}
                        disabled={generateQRMutation.isPending}
                        className="gap-2"
                      >
                        {generateQRMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-5 h-5" />
                            Generate QR Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Active QR Code */}
                  {hasActiveQR && qrCodeUrl && (
                    <div className="space-y-6">
                      {/* QR Code Image */}
                      <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl border-4 border-blue-500 mx-auto max-w-md">
                        <img
                          src={qrCodeUrl}
                          alt="Order QR Code"
                          className="w-full h-auto"
                        />
                      </div>

                      {/* Timer for Cash Orders */}
                      {order.paymentType === 'CASH' && timeLeft !== null && (
                        <div className="text-center">
                          {isQRExpired ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center space-x-2 text-red-600">
                                <AlertCircle className="w-6 h-6" />
                                <span className="text-xl font-semibold">QR Code Expired</span>
                              </div>
                              <Button
                                size="lg"
                                onClick={handleGenerateQR}
                                disabled={generateQRMutation.isPending}
                                className="gap-2"
                              >
                                <RefreshCw className="w-5 h-5" />
                                Generate New QR Code
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Time remaining
                              </p>
                              <div
                                className={`text-4xl font-bold ${
                                  timeLeft < 30 ? 'text-red-600' : 'text-blue-600'
                                }`}
                              >
                                {formatTime(timeLeft)}
                              </div>
                              <p className="text-sm text-gray-500">
                                Show this QR at the counter before it expires
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg space-y-3">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center space-x-2">
                          <Package className="w-5 h-5" />
                          <span>How to collect your order</span>
                        </h4>
                        <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                          <li className="flex items-start space-x-2">
                            <span className="font-bold">1.</span>
                            <span>Show this QR code at the counter</span>
                          </li>
                          {order.paymentType === 'CASH' ? (
                            <li className="flex items-start space-x-2">
                              <span className="font-bold">2.</span>
                              <span>Pay {formatCurrency(order.totalAmount)} in cash</span>
                            </li>
                          ) : (
                            <li className="flex items-start space-x-2">
                              <span className="font-bold">2.</span>
                              <span>Payment already completed online</span>
                            </li>
                          )}
                          <li className="flex items-start space-x-2">
                            <span className="font-bold">3.</span>
                            <span>Collect your items</span>
                          </li>
                        </ol>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={handleDownloadQR}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download QR
                        </Button>
                        {order.paymentType === 'CASH' && !isQRExpired && (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleGenerateQR}
                            disabled={generateQRMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate QR
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cancelled Order */}
                  {order.status === 'CANCELLED' && (
                    <div className="text-center space-y-4 py-8">
                      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                        <XCircle className="w-10 h-10 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-red-600 mb-2">
                          Order Cancelled
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          This order has been cancelled.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle className="flex items-center justify-between">
                  <span>Order Items</span>
                  <Badge variant="secondary">{order.orderItems?.length || 0} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {order.orderItems?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Product Image */}
                      <div className="relative w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden shrink-0">
                        {item.product?.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
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
                          {item.product?.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity} × {formatCurrency(item.product?.price || 0)}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-bold text-blue-600">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-0 shadow-xl sticky top-20">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      {formatCurrency(order.totalAmount)}
                    </span>
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
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Order Timeline */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Order Timeline
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Order Placed
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {order.paidAt && (
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Payment Confirmed
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.paidAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.completedAt && (
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Order Completed
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === 'PENDING' && (
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-500">
                            Awaiting Pickup
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}