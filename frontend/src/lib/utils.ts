import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export const getStockLevelColor = (level: "LOW" | "MEDIUM" | "HIGH") => {
  switch (level) {
    case "LOW":
      return "text-red-500";
    case "MEDIUM":
      return "text-yellow-500";
    case "HIGH":
      return "text-green-500";
    default:
      return "";
  }
};

