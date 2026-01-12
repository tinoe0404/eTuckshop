'use client';

import { useStockUpdates } from '@/lib/hooks/useStockUpdates';

/**
 * Global component to handle real-time stock updates
 * Place this in your main layout
 */
export default function StockUpdater() {
    useStockUpdates();
    return null; // Renderless component
}
