import QRCode from "qrcode";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface QRPayload {
  orderId: number;
  orderNumber: string;
  paymentType: "CASH" | "PAYNOW";
  customer: {
    name: string;
    email: string;
  };
  orderSummary: {
    items: OrderItem[];
    totalItems: number;
    totalAmount: number;
  };
  expiresAt?: string;
  timestamp: string;
}

export const generateQRCode = async (data: QRPayload): Promise<string> => {
  try {
    const qrDataString = JSON.stringify(data);
    const qrCodeDataURL = await QRCode.toDataURL(qrDataString, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
};

export const decodeQRData = (qrData: string): QRPayload | null => {
  try {
    return JSON.parse(qrData) as QRPayload;
  } catch {
    return null;
  }
};