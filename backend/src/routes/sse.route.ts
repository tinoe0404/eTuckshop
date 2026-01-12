// src/routes/sse.route.ts
import { Hono } from 'hono';
import { sseHandler, getActiveConnectionCount } from '../sse-server';
import { requireAuth } from '../middlewares/auth.middleware';

const router = new Hono();

/**
 * SSE endpoint - Establishes real-time connection
 * Query params:
 *   - products: comma-separated product IDs to subscribe to (optional)
 * 
 * Example: GET /api/sse/events?products=1,2,3
 */
router.get('/events', requireAuth, sseHandler);

/**
 * Health check endpoint - Returns active connection count
 */
router.get('/health', requireAuth, (c) => {
    return c.json({
        success: true,
        activeConnections: getActiveConnectionCount(),
        timestamp: new Date().toISOString()
    });
});

export default router;
