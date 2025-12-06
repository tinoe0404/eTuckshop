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
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  QrCode,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Detect payment success from PayNow redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      
      if (paymentStatus === 'success') {
        toast.success('Payment successful! Your QR code is ready.');
        window.history.replaceState({}, '', `/orders/${orderId}`);
      } else if (paymentStatus === 'already_paid') {
        toast.info('This order has already been paid.');
        window.history.replaceState({}, '', `/orders/${orderId}`);
      }
    }
  }, [orderId]);

  // Fetch order details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId),
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const order = query.state.data.data;
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

  // Fetch QR code for PAID PayNow orders
  useEffect(() => {
    const fetchPayNowQR = async () => {
      if (order && order.status === 'PAID' && order.paymentType === 'PAYNOW' && !qrCodeUrl) {
        try {
          const qrResponse = await orderService.getOrderQR(orderId);
          if (qrResponse.success && qrResponse.data.qrCode) {
            setQrCodeUrl(qrResponse.data.qrCode);
          }
        } catch (error) {
          console.error('Failed to fetch PayNow QR:', error);
        }
      }
    };

    fetchPayNowQR();
  }, [order, orderId, qrCodeUrl]);

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
  
  const hasActiveQR = 
    (order.status === 'PAID' && order.paymentType === 'PAYNOW' && qrCodeUrl) ||
    (order.status === 'PAID' && order.paymentType === 'CASH' && qrCodeUrl) ||
    (order.paymentType === 'CASH' && qrCodeUrl && !isQRExpired);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Full implementation continues... */}
        {/* (Rest of the JSX - too long to repeat, use the version from my previous complete message) */}
      </div>
    </div>
  );
}