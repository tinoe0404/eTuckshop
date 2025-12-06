'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';

import { orderService } from '@/lib/api/services/order.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type QRState = {
  qrCodeUrl: string | null;
  expiresAt: string | null;
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();

  const [qrState, setQrState] = useState<QRState>({
    qrCodeUrl: null,
    expiresAt: null,
  });

  /** -------------------------------------------------
   * 1. Fetch order details
   * ------------------------------------------------- */
  const { data: orderResponse, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(Number(orderId)),

    refetchInterval: (query) => {
      const order = query.state.data?.data;
      if (!order) return false;

      const shouldPoll = ['PENDING', 'PAID'].includes(order.status);
      return shouldPoll ? 5000 : false;
    },
  });

  const order = orderResponse?.data;

  /** -------------------------------------------------
   * 2. DERIVED ORDER SUMMARY (instead of order.orderSummary)
   * ------------------------------------------------- */
  const orderSummary = useMemo(() => {
    if (!order) return null;

    const items = order.orderItems.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      subtotal: item.subtotal,
      image: item.product.image ?? '',
    }));

    return {
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount: order.totalAmount,
    };
  }, [order]);

  /** -------------------------------------------------
   * 3. Fetch QR helper
   * ------------------------------------------------- */
  const fetchQR = useCallback(async () => {
    try {
      const qrResponse = await orderService.getOrderQR(Number(orderId));

      if (qrResponse.success && qrResponse.data) {
        const { qrCode, expiresAt } = qrResponse.data;

        setQrState({
          qrCodeUrl: qrCode ?? null,
          expiresAt: expiresAt ?? null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch PayNow QR:', error);
    }
  }, [orderId]);

  /** -------------------------------------------------
   * 4. Auto-fetch QR for PayNow Paid orders
   * ------------------------------------------------- */
  useEffect(() => {
    if (!order) return;

    const needsQR =
      order.status === 'PAID' &&
      order.paymentType === 'PAYNOW' &&
      !qrState.qrCodeUrl;

    if (needsQR) fetchQR();
  }, [order, fetchQR, qrState.qrCodeUrl]);

  /** -------------------------------------------------
   * 5. Loading Screen
   * ------------------------------------------------- */
  if (isLoading || !order || !orderSummary) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  /** -------------------------------------------------
   * 6. Render
   * ------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Order #{order.orderNumber}
            <Badge>{order.status}</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Order Summary */}
          <div>
            <h2 className="font-semibold text-lg">Order Summary</h2>

            <p>Total Items: {orderSummary.totalItems}</p>
            <p>Total Amount: ${orderSummary.totalAmount}</p>
          </div>

          {/* Items */}
          <div className="space-y-4">
            {orderSummary.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={60}
                  height={60}
                  className="rounded-lg"
                />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PayNow QR */}
          {order.paymentType === 'PAYNOW' && (
            <div className="mt-6 text-center">
              <h3 className="text-lg font-semibold mb-3">PayNow QR Code</h3>

              {qrState.qrCodeUrl ? (
                <>
                  <Image
                    src={qrState.qrCodeUrl}
                    alt="PayNow QR"
                    width={220}
                    height={220}
                    className="mx-auto"
                  />
                  {qrState.expiresAt && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Expires at:{' '}
                      {new Date(qrState.expiresAt).toLocaleTimeString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Generating QR code...</p>
              )}
            </div>
          )}

          <Button className="w-full mt-8" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
