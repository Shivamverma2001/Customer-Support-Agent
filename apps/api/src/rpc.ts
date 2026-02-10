/**
 * RPC entry: app + AppType (no Node/serve).
 * Phase 2: All 7 API routes; Phase 6 bonus: rate limiting.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as chatController from "./controllers/chatController";
import * as agentsController from "./controllers/agentsController";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { rateLimitMiddleware } from "./middleware/rateLimit";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Accept", "x-user-id"],
    exposeHeaders: ["Content-Type"],
  })
);
app.use("*", rateLimitMiddleware);

// ——— Root (Vercel rewrite sends / here)
app.get("/", (c) => {
  return c.json({
    service: "customer-support-api",
    docs: "https://github.com/Shivamverma2001/Customer-Support-Agent",
    health: "/api/health",
  });
});
app.get("/favicon.ico", () => new Response(null, { status: 204 }));

// ——— Health
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "customer-support-api",
  });
});

// ——— Chat (Phase 2: POST messages; Phase 4: streaming)
app.post("/api/chat/messages", (c) => chatController.postMessage(c));
app.post("/api/chat/messages/stream", (c) => chatController.postMessageStream(c));
app.get("/api/chat/conversations", (c) => chatController.listConversations(c));
app.get("/api/chat/conversations/:id", (c) => chatController.getConversationById(c));
app.delete("/api/chat/conversations/:id", (c) => chatController.deleteConversation(c));

// ——— Agents
app.get("/api/agents", (c) => agentsController.listAgents(c));
app.get("/api/agents/:type/capabilities", (c) => agentsController.getCapabilities(c));

// Error handling (Phase 2 requirement)
app.onError(errorHandler);
app.notFound(notFoundHandler);

export type AppType = typeof app;
export { app };
