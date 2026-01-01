'use client';

import { useState, useRef, useEffect } from 'react';
import { useCompleteOrder, useScanQRCode } from '@/lib/hooks/useOrders';
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
  Camera,
  X,
  SwitchCamera,
  Keyboard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Updated Interface to be more flexible
interface ScannedOrder {
  paymentMethod: {
    type: string;
    label?: string;
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
  instructions?: string;
  action?: {
    complete: string;
  };
}

export default function AdminQRScannerPage() {
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [qrInput, setQrInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<ScannedOrder | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Use the hook from useOrders
  const scanQRMutation = useScanQRCode();
  
  // ✅ Use the hook with proper success handling
  const completeOrderMutation = useCompleteOrder();

  // ✅ Handle scan success separately
  useEffect(() => {
    if (scanQRMutation.isSuccess && scanQRMutation.data) {
      setScannedOrder(scanQRMutation.data.data as ScannedOrder);
      stopCamera();
    }
  }, [scanQRMutation.isSuccess, scanQRMutation.data]);

  // ✅ Handle complete order success
  useEffect(() => {
    if (completeOrderMutation.isSuccess) {
      setShowCompleteDialog(false);
      setTimeout(() => {
        setScannedOrder(null);
        setQrInput('');
        if (scanMode === 'camera') {
          startCamera();
        }
      }, 2000);
    }
  }, [completeOrderMutation.isSuccess, scanMode]);

  // Start camera
  const startCamera = async (facing?: 'user' | 'environment') => {
    const useFacing = facing || facingMode;
    try {
      setCameraError(null);

      const constraints = {
        video: {
          facingMode: useFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          const playResult = videoRef.current.play();
          if (playResult instanceof Promise) {
            await playResult;
          }
        } catch (err: any) {
          console.warn('Video play interrupted or blocked:', err?.name || err);
        }

        setIsCameraActive(true);
        startScanning();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions.'
          : error?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Failed to start camera. Please try again.'
      );
      toast.error('Camera error: ' + (error?.message || 'Unknown error'));
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {
        // ignore
      }
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }

    setIsCameraActive(false);
  };

  // Switch camera
  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    stopCamera();
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  // Start scanning QR codes
  const startScanning = () => {
    if (scanIntervalRef.current) return;

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || scanQRMutation.isPending) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const code = (window as any).jsQR?.(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          scanQRMutation.mutate(code.data);
        }
      } catch (error) {
        console.error('QR decode error:', error);
      }
    }, 300);
  };

  // Load jsQR library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Start camera on mount
  useEffect(() => {
    if (scanMode === 'camera' && !scannedOrder) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, scannedOrder]);

  const handleManualScan = () => {
    const trimmedData = qrInput.trim();

    if (!trimmedData) {
      toast.error('Please enter QR code data');
      return;
    }

    scanQRMutation.mutate(trimmedData);
  };

  const handleCompleteOrder = () => {
    if (!scannedOrder?.orderInfo?.orderId) {
      toast.error('No order to complete');
      return;
    }
    
    console.log('🔄 Completing order:', scannedOrder.orderInfo.orderId);
    
    completeOrderMutation.mutate(scannedOrder.orderInfo.orderId, {
      onSuccess: () => {
        // ✅ Close the complete dialog
        setShowCompleteDialog(false);
        
        // ✅ Clear scanned order (go back to scanner)
        setScannedOrder(null);
        setShowDetails(false);
        
        // ✅ Success toast already shown by useCompleteOrder hook
        console.log('✅ Order completed successfully');
      },
      onError: (error: any) => {
        // ✅ Keep dialog open on error so user can retry
        console.error('❌ Failed to complete order:', error);
        // Error toast already shown by useCompleteOrder hook
      }
    });
  };

  const handleReset = () => {
    setScannedOrder(null);
    setQrInput('');
    scanQRMutation.reset();
    completeOrderMutation.reset();
    if (scanMode === 'camera') {
      startCamera();
    }
  };

  const toggleScanMode = () => {
    stopCamera();
    setScanMode((prev) => (prev === 'camera' ? 'manual' : 'camera'));
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
          <p className="text-gray-400">Scan customer QR codes to process pickups</p>
        </div>

        {/* Scanner Card */}
        {!scannedOrder ? (
          <Card className="bg-[#1a2332] border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-white">
                  {scanMode === 'camera' ? (
                    <Camera className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Keyboard className="w-5 h-5 text-blue-400" />
                  )}
                  <span>{scanMode === 'camera' ? 'Camera Scanner' : 'Manual Entry'}</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleScanMode}
                  className="border-gray-700"
                >
                  {scanMode === 'camera' ? (
                    <>
                      <Keyboard className="w-4 h-4 mr-2" />
                      Manual
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Camera Mode */}
              {scanMode === 'camera' ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-4 p-6">
                          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                          <div>
                            <p className="text-red-400 font-semibold mb-2">Camera Error</p>
                            <p className="text-gray-400 text-sm">{cameraError}</p>
                          </div>
                          <Button onClick={() => startCamera()} variant="outline">
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : !isCameraActive ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                      </div>
                    ) : null}

                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-400" />
                          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-400" />
                          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-400" />
                          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-400" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-0.5 bg-blue-400 animate-pulse" />
                      </div>
                    )}

                    {isCameraActive && (
                      <>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-red-500 text-white gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            {scanQRMutation.isPending ? 'Processing...' : 'Scanning...'}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={switchCamera}
                          className="absolute top-4 right-4"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm text-blue-300">
                        <p className="font-semibold">How to scan:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Point camera at customer's QR code</li>
                          <li>Hold steady until automatic detection</li>
                          <li>Verify order details before completing pickup</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm text-blue-300">
                        <p className="font-semibold">Manual entry:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Ask customer to show their QR code</li>
                          <li>Paste or type the QR data below</li>
                          <li>Click "Scan QR Code" to verify</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">QR Code Data</label>
                    <Textarea
                      placeholder="Paste QR code data here..."
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      className="bg-[#0f1419] border-gray-700 text-white min-h-[120px] font-mono text-sm"
                      disabled={scanQRMutation.isPending}
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleManualScan}
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
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Scanned Order Details - Keep your existing JSX here */
          <div className="space-y-6">
            {/* Success Header */}
            <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">QR Verified!</h2>
                    <p className="text-gray-400 mt-1">Order #{scannedOrder.orderInfo.orderNumber}</p>
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
                        {scannedOrder.paymentMethod.label || scannedOrder.paymentMethod.type}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      {scannedOrder.paymentMethod.type}
                    </Badge>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-300">
                        {scannedOrder.instructions || 'No special instructions.'}
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
                      <p className="text-white font-semibold">{scannedOrder.customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-[#0f1419] rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-semibold">{scannedOrder.customer.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            {scannedOrder.orderSummary && (
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
                        <p className="text-blue-400 font-semibold">{formatCurrency(item.subtotal)}</p>
                      </div>
                    ))}

                    <Separator className="bg-gray-700" />

                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg">
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
            )}

            {/* Order Metadata */}
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Order Number</p>
                    <p className="text-white font-semibold">{scannedOrder.orderInfo.orderNumber}</p>
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
                disabled={completeOrderMutation.isPending}
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
                <X className="w-5 h-5 mr-2" />
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

              <AlertDialogDescription asChild>
                <div className="text-gray-400 space-y-2">
                  <p>Confirm that you have:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {scannedOrder?.paymentMethod.type === 'CASH' && scannedOrder?.orderSummary && (
                      <li>
                        Collected ${scannedOrder.orderSummary.totalAmount.toFixed(2)} in cash
                      </li>
                    )}
                    {scannedOrder?.paymentMethod.type === 'PAYNOW' && <li>Verified payment confirmation</li>}
                    {scannedOrder?.orderSummary && (
                      <li>Handed over all {scannedOrder.orderSummary.totalItems} items</li>
                    )}
                  </ul>
                  <p className="text-yellow-400 mt-3">
                    ⚠️ This action cannot be undone. The QR code will be expired.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={completeOrderMutation.isPending}
              >
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

function setShowDetails(arg0: boolean) {
  throw new Error('Function not implemented.');
}
