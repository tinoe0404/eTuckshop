// utils/qrCode.ts - FIXED VERSION

import QRCode from 'qrcode';

export interface QRPayload {
  orderId: number;
  orderNumber: string;
  paymentType: string;
  paymentStatus: string;
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
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
}

/**
 * Generate QR code from payload
 * Encodes payload as JSON string (not base64)
 */
export async function generateQRCode(payload: QRPayload): Promise<string> {
  try {
    // Convert payload to JSON string
    const jsonString = JSON.stringify(payload);
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(jsonString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Decode QR data string back to payload
 * Handles both JSON string and already-parsed objects
 */
export function decodeQRData(qrData: string): QRPayload | null {
  try {
    // If qrData is already an object (shouldn't happen but handle it)
    if (typeof qrData === 'object') {
      return qrData as QRPayload;
    }

    // Try to parse as JSON
    const parsed = JSON.parse(qrData);
    
    // Validate required fields
    if (!parsed.orderId || !parsed.orderNumber || !parsed.paymentType) {
      console.error('Invalid QR payload - missing required fields');
      return null;
    }

    return parsed as QRPayload;
  } catch (error) {
    console.error('Error decoding QR data:', error);
    return null;
  }
}

/**
 * Validate QR payload structure
 */
export function validateQRPayload(payload: any): payload is QRPayload {
  return (
    payload &&
    typeof payload.orderId === 'number' &&
    typeof payload.orderNumber === 'string' &&
    typeof payload.paymentType === 'string' &&
    typeof payload.paymentStatus === 'string' &&
    payload.customer &&
    typeof payload.customer.name === 'string' &&
    typeof payload.customer.email === 'string' &&
    payload.orderSummary &&
    Array.isArray(payload.orderSummary.items) &&
    typeof payload.orderSummary.totalItems === 'number' &&
    typeof payload.orderSummary.totalAmount === 'number'
  );
}