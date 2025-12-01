import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStockLevelColor(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (level) {
    case 'LOW':
      return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    case 'HIGH':
      return 'text-green-600 bg-green-50 dark:bg-green-900/20';
  }
}

export function getOrderStatusColor(
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED'
): string {
  switch (status) {
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    case 'PAID':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    case 'COMPLETED':
      return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    case 'CANCELLED':
      return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  }
}
