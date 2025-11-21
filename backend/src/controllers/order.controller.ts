import { Context } from "hono";
import { prisma } from "../utils/db";
import { serverError } from "../utils/serverError";
import { generateQRCode, decodeQRData } from "../utils/qrCode";

// ==============================
// HELPER: GENERATE ORDER NUMBER
// ==============================
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};
