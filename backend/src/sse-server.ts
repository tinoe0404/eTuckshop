// src/sse-server.ts
// Server-Sent Events implementation for real-time updates (Vercel compatible)

import { Context } from 'hono';

interface SSEClient {
    controller: ReadableStreamDefaultController;
    userId?: number;
    role?: string;
    subscribedProducts: Set<number>;
}

const clients = new Map<string, SSEClient>();

// Generate unique client ID
const generateClientId = () => `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * SSE Handler - Creates a persistent connection for real-time updates
 * Compatible with Vercel (no WebSocket support needed)
 */
export const sseHandler = async (c: Context) => {
    // 1. Try to get user from Context (set by requireAuth middleware)
    const user = c.get('user');

    // 2. Fallback to headers or query params
    const userId = user?.id || c.req.header('X-User-Id') || c.req.query('userId');
    const role = user?.role || c.req.header('X-User-Role');
    const productIds = c.req.query('products')?.split(',').map(Number) || [];

    const clientId = generateClientId();

    // Create SSE stream
    const stream = new ReadableStream({
        start(controller) {
            // Store client
            clients.set(clientId, {
                controller,
                userId: userId ? Number(userId) : undefined,
                role,
                subscribedProducts: new Set(productIds)
            });

            // Send initial connection success
            const data = `data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));

            // Keep-alive ping every 5 seconds (prevents Bun's 10s default timeout)
            const keepAlive = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
                } catch {
                    clearInterval(keepAlive);
                    clients.delete(clientId);
                }
            }, 5000);

            // Cleanup on client disconnect
            c.req.raw.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
                clients.delete(clientId);
                console.log(`📡 SSE client disconnected: ${clientId}`);
            });

            console.log(`📡 SSE client connected: ${clientId} (User: ${userId || 'guest'}, Role: ${role || 'none'})`);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        }
    });
};

/**
 * Broadcast stock update to all subscribed clients
 * Called after product stock changes
 */
export const broadcastStockUpdate = (productId: number, newStock: number, productName?: string) => {
    const message = {
        type: 'stock_update',
        productId,
        stock: newStock,
        productName,
        timestamp: new Date().toISOString()
    };

    const data = `data: ${JSON.stringify(message)}\n\n`;
    const encoded = new TextEncoder().encode(data);

    let sentCount = 0;
    clients.forEach((client, clientId) => {
        // Send if client subscribed to this product OR subscribed to all (empty set)
        if (client.subscribedProducts.has(productId) || client.subscribedProducts.size === 0) {
            try {
                client.controller.enqueue(encoded);
                sentCount++;
            } catch (error) {
                console.error(`Failed to send stock update to ${clientId}:`, error);
                clients.delete(clientId);
            }
        }
    });

    if (sentCount > 0) {
        console.log(`📡 Stock update for product ${productId} sent to ${sentCount}/${clients.size} clients`);
    }
};

/**
 * Broadcast order status update to admin and order owner
 * Called after order status changes
 */
export const broadcastOrderUpdate = (orderId: number, status: string, userId?: number) => {
    const message = {
        type: 'order_update',
        orderId,
        status,
        timestamp: new Date().toISOString()
    };

    const data = `data: ${JSON.stringify(message)}\n\n`;
    const encoded = new TextEncoder().encode(data);

    let sentCount = 0;
    clients.forEach((client, clientId) => {
        // Send to admins OR the customer who placed the order
        if (client.role === 'ADMIN' || client.userId === userId) {
            try {
                client.controller.enqueue(encoded);
                sentCount++;
            } catch (error) {
                console.error(`Failed to send order update to ${clientId}:`, error);
                clients.delete(clientId);
            }
        }
    });

    if (sentCount > 0) {
        console.log(`📡 Order ${orderId} update sent to ${sentCount} clients`);
    }
};

/**
 * Get count of active SSE connections (for monitoring)
 */
export const getActiveConnectionCount = () => clients.size;
