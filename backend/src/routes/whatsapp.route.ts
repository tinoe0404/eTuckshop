// src/routes/whatsapp.route.ts
import { Hono } from 'hono';
import { handleWebhookVerification, handleWebhookPost } from '../chatbot/bot.controller';

const whatsappRoutes = new Hono();

// ==============================
// WEBHOOK ENDPOINTS
// ==============================

/**
 * GET /webhook - Webhook verification
 * Meta calls this once when setting up the webhook
 */
whatsappRoutes.get('/webhook', handleWebhookVerification);

/**
 * POST /webhook - Receive messages
 * Meta sends all incoming messages here
 */
whatsappRoutes.post('/webhook', handleWebhookPost);

export default whatsappRoutes;
