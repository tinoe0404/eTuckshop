'use client';

import { useStockUpdates } from '@/lib/api/products/stock.hooks';

/**
 * Global component to handle real-time stock updates
 * Place this in your main layout
 */
export default function StockUpdater() {
    useStockUpdates();
    return null; // Renderless component
}

