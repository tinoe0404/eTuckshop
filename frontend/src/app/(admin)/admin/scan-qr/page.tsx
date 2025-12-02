'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { orderService } from '@/lib/api/services/order.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  QrCode,
  Scan,
  CheckCircle,
  XCircle,
  Wallet,
  CreditCard,
  Package,
  User,
  Mail,
  DollarSign,
  AlertCircle,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ScannedOrder {
  paymentMethod: {
    type: string;
    label: string;
    status: string;
  };
  customer: {
    name: string;
    email: string;
  };
  orderSummary: {
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    totalItems: number;
    totalAmount: number;
  };
  orderInfo: {
    orderId: number;
    orderNumber: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
  };
  instructions: string;
  action?: {
    complete: string;
  };
}

export default function AdminQRScannerPage() {
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<ScannedOrder | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Scan QR mutation
  const scanQRMutation = useMutation({
    mutationFn: (qrData: string) => orderService.scanQRCode(qrData),
    onSuccess: (response) => {
      if (response.success) {
        setScannedOrder(response.data);
        toast.success(response.message || 'QR scanned successfully');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to scan QR code';
      const suggestion = error.response?.data?.data?.suggestion;
      
      if (suggestion) {
        toast.error(`${message}\n${suggestion}`);
      } else {
        toast.error(message);
      }
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: (orderId: number) => orderService.completeOrder(orderId),
    onSuccess: (response) => {
      toast.success(response.message || 'Order completed successfully');
      setShowCompleteDialog(false);
      // Reset scanner
      setTimeout(() => {
        setScannedOrder(null);
        setQrInput('');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete order');
    },
  });

  const handleScanQR = () => {
    const trimmedData = qrInput.trim();
    
    if (!trimmedData) {
      toast.error('Please enter QR code data');
      return;
    }

    scanQRMutation.mutate(trimmedData);
  };

  const handleCompleteOrder = () => {
    if (scannedOrder?.orderInfo?.orderId) {
      completeOrderMutation.mutate(scannedOrder.orderInfo.orderId);
    }
  };

  const handleReset = () => {
    setScannedOrder(null);
    setQrInput('');
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">QR Code Scanner</h1>
          <p className="text-gray-400">
            Scan customer QR codes to process pickups
          </p>
        </div>

        {/* Scanner Card */}
        {!scannedOrder ? (
          <Card className="bg-[#1a2332] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center space-x-2 text-white">
                <Scan className="w-5 h-5 text-blue-400" />
                <span>Scan QR Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div className="space-y-2 text-sm text-blue-300">
                    <p className="font-semibold">How to scan:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Ask customer to show their QR code</li>
                      <li>Paste or type the QR data in the field below</li>
                      <li>Click "Scan QR Code" to verify the order</li>
                      <li>Complete the pickup after payment verification</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* QR Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">
                  QR Code Data
                </label>
                <Textarea
                  placeholder="Paste QR code data here..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="bg-[#0f1419] border-gray-700 text-white min-h-[120px] font-mono text-sm"
                  disabled={scanQRMutation.isPending}
                />
              </div>

              {/* Scan Button */}
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleScanQR}
                disabled={scanQRMutation.isPending || !qrInput.trim()}
              >
                {scanQRMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5 mr-2" />
                    Scan QR Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Scanned Order Details */
          <div className="space-y-6">
            {/* Success Header */}
            <Card className="bg-linear-to-r from-green-900/20 to-blue-900/20 border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">QR Verified!</h2>
                    <p className="text-gray-400 mt-1">
                      Order #{scannedOrder.orderInfo.orderNumber}
                    </p>
                  </div>
                  <Badge
                    className={
                      scannedOrder.orderInfo.status === 'PAID'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }
                  >
                    {scannedOrder.orderInfo.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="bg-[#1a2332] border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center space-x-2 text-white">
                  {scannedOrder.paymentMethod.type === 'CASH' ? (
                    <Wallet className="w-5 h-5 text-green-400" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  )}
                  <span>Payment Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg">
                    <div>
                      <p className="text-sm text-gray-400">Payment Method</p>
                      <p className="text-lg font-semibold text-white">
                        {scannedOrder.paymentMethod.label}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-gray-700 text-gray-300"
                    >
                      {scannedOrder.paymentMethod.type}
                    </Badge>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-300">
                        {scannedOrder.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="bg-[#1a2332] border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center space-x-2 text-white">
                  <User className="w-5 h-5 text-purple-400" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-[#0f1419] rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="text-white font-semibold">
                        {scannedOrder.customer.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-[#0f1419] rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-semibold">
                        {scannedOrder.customer.email}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="bg-[#1a2332] border-gray-800">
              <CardHeader className="border-b border-gray-800">
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-orange-400" />
                    <span>Order Summary</span>
                  </span>
                  <Badge variant="outline" className="border-gray-700 text-gray-300">
                    {scannedOrder.orderSummary.totalItems} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {scannedOrder.orderSummary.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-[#0f1419] rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-sm text-gray-400">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="text-blue-400 font-semibold">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  ))}

                  <Separator className="bg-gray-700" />

                  <div className="flex justify-between items-center p-4 bg-linear-to-r from-blue-900/20 to-purple-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <span className="text-lg font-bold text-white">Total Amount</span>
                    </div>
                    <span className="text-3xl font-bold text-blue-400">
                      {formatCurrency(scannedOrder.orderSummary.totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Metadata */}
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Order Number</p>
                    <p className="text-white font-semibold">
                      {scannedOrder.orderInfo.orderNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <Badge className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {scannedOrder.orderInfo.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="text-white">
                      {new Date(scannedOrder.orderInfo.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {scannedOrder.orderInfo.paidAt && (
                    <div>
                      <p className="text-gray-400">Paid At</p>
                      <p className="text-white">
                        {new Date(scannedOrder.orderInfo.paidAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button
                size="lg"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => setShowCompleteDialog(true)}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Pickup
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Complete Order Dialog */}
        <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent className="bg-[#1a2332] border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span>Complete Order Pickup?</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 space-y-2">
                <p>
                  Confirm that you have:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {scannedOrder?.paymentMethod.type === 'CASH' && (
                    <li>Collected ${scannedOrder?.orderSummary.totalAmount.toFixed(2)} in cash</li>
                  )}
                  {scannedOrder?.paymentMethod.type === 'PAYNOW' && (
                    <li>Verified payment confirmation</li>
                  )}
                  <li>Handed over all {scannedOrder?.orderSummary.totalItems} items</li>
                </ul>
                <p className="text-yellow-400 mt-3">
                  ⚠️ This action cannot be undone. The QR code will be expired.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
                Go Back
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCompleteOrder}
                disabled={completeOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {completeOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Confirm Pickup'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}