import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/api/queryKeys';

interface SSEEvent {
    type: 'stock_update' | 'order_update' | 'ping';
    productId?: number;
    orderId?: number;
    newStock?: number;
    status?: string;
    timestamp: string;
}

export function useStockUpdates() {
    const queryClient = useQueryClient();
    const { data: session, status } = useSession();

    useEffect(() => {
        // Only run in browser and when user is logged in
        if (typeof window === 'undefined' || status !== 'authenticated' || !session?.user?.id) return;

        // Fix: Handle different API URL formats (with or without /api suffix)
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

        // Ensure we construct /api/sse/events correctly
        const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

        // ✅ PASS USER ID & SIGNATURE
        const signature = session.user.signature || '';
        const sseUrl = `${baseUrl}/sse/events?userId=${session.user.id}&signature=${signature}`;

        console.log('🔌 Connecting to real-time updates:', sseUrl);

        const eventSource = new EventSource(sseUrl, {
            withCredentials: true
        });

        eventSource.onopen = () => {
            console.log('✅ Connected to real-time updates');
        };

        eventSource.onmessage = (event) => {
            try {
                const data: SSEEvent = JSON.parse(event.data);

                if (data.type === 'ping') return;

                console.log('⚡ Real-time event received:', data);

                if (data.type === 'stock_update') {
                    // Update all product views
                    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
                }

                if (data.type === 'order_update') {
                    const currentPath = window.location.pathname;
                    // Only show toasts/invalidate if viewing orders or details
                    if (currentPath.includes('/orders')) {
                        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
                        if (data.status) {
                            toast.success(`Order #${data.orderId} is now ${data.status}`);
                        }
                    }
                }

            } catch (error) {
                console.error('❌ Failed to parse SSE event:', error);
            }
        };

        eventSource.onerror = (error) => {
            // console.error('⚠️ SSE Connection lost', error);
            eventSource.close();
        };

        return () => {
            console.log('🔌 Disconnecting real-time updates');
            eventSource.close();
        };
    }, [queryClient, session, status]);
}
