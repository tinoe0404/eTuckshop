import { Hono } from 'hono';

const app = new Hono();

// Health check route
app.get('/', (c) => {
  return c.html('<h1>Hello from Hono!</h1>');
});


// Start server
const port = 3000;
console.log(`🚀 Server running at http://localhost:${port}`);
export default app;

Bun.serve({
  fetch: app.fetch,
  port,
});
