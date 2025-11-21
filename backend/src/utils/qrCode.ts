import QRCode from "qrcode";

interface QRPayload {
  orderId: number;
  orderNumber: string;
  amount: number;
  paymentType: "CASH" | "PAYNOW";
  expiresAt?: string;
  timestamp: string;
}

export const generateQRCode = async (data: QRPayload): Promise<string> => {
  try {
    const qrDataString = JSON.stringify(data);
    const qrCodeDataURL = await QRCode.toDataURL(qrDataString, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
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