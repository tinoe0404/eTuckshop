import QRCode from "qrcode";

export interface QRPayload {
  orderId: number;
  orderNumber: string;
  paymentType: "CASH" | "PAYNOW";
  paymentStatus: "PENDING" | "PAID";
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

export const generateQRCode = async (data: QRPayload): Promise<string> => {
  const qrDataString = JSON.stringify(data);
  return await QRCode.toDataURL(qrDataString, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  });
};

export const decodeQRData = (qrData: string): QRPayload | null => {
  try {
    return JSON.parse(qrData) as QRPayload;
  } catch {
    return null;
  }
};