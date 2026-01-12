// utils/qrCode.ts - SECURITY ENHANCED VERSION
import * as QRCode from 'qrcode';
import { createHmac } from 'crypto';

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
  signature?: string; // HMAC signature to prevent tampering
}

/**
 * Sign QR payload to prevent tampering
 * Signs critical fields: orderId, orderNumber, expiresAt
 */
const signPayload = (payload: Omit<QRPayload, 'signature'>): string => {
  const secret = process.env.QR_SIGNING_SECRET || 'dev-secret-change-in-production';

  // Create deterministic string to sign (critical fields only)
  const dataToSign = JSON.stringify({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    expiresAt: payload.expiresAt,
    createdAt: payload.createdAt
  });

  return createHmac('sha256', secret)
    .update(dataToSign)
    .digest('hex');
};

/**
 * Verify QR payload signature
 */
const verifySignature = (payload: QRPayload): boolean => {
  if (!payload.signature) {
    return false;
  }

  const { signature, ...payloadWithoutSig } = payload;
  const expectedSignature = signPayload(payloadWithoutSig);

  return signature === expectedSignature;
};

/**
 * Generate QR code from payload with signature
 * Encodes payload as JSON string with HMAC signature
 */
export async function generateQRCode(payload: Omit<QRPayload, 'signature'>): Promise<string> {
  try {
    // Add signature to payload
    const signedPayload: QRPayload = {
      ...payload,
      signature: signPayload(payload)
    };

    // Convert payload to JSON string
    const jsonString = JSON.stringify(signedPayload);

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
 * Decode and verify QR data string back to payload
 * Returns null if signature verification fails
 */
export function decodeQRData(qrData: string): QRPayload | null {
  try {
    // If qrData is already an object (shouldn't happen but handle it)
    if (typeof qrData === 'object') {
      const payload = qrData as QRPayload;
      if (!verifySignature(payload)) {
        console.error('QR signature verification failed (object input)');
        return null;
      }
      return payload;
    }

    // Try to parse as JSON
    const parsed = JSON.parse(qrData);

    // Validate required fields
    if (!parsed.orderId || !parsed.orderNumber || !parsed.paymentType) {
      console.error('Invalid QR payload - missing required fields');
      return null;
    }

    // Verify signature (CRITICAL SECURITY CHECK)
    if (!verifySignature(parsed)) {
      console.error('QR signature verification failed - possible tampering detected');
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
    typeof payload.orderSummary.totalAmount === 'number' &&
    (!payload.signature || typeof payload.signature === 'string')
  );
}