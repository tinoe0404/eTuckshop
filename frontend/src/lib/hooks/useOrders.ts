'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserOrdersAction } from '@/lib/api/orders/orders.actions';

/**
 * Hook to fetch current user's orders
 */
export const useOrders = () => {
    return useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const res = await getUserOrdersAction();
            if (!res.success) {
                throw new Error(res.message || 'Failed to fetch orders');
            }
            return res.data?.orders || [];
        },
    });
};
