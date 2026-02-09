/**
 * RPC entry: app + AppType (no Node/serve).
 * Phase 2: All 7 API routes; Phase 6 bonus: rate limiting.
 */
import { Hono } from "hono";
import * as chatController from "./controllers/chatController";
import * as agentsController from "./controllers/agentsController";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { rateLimitMiddleware } from "./middleware/rateLimit";

const app = new Hono();

app.use("*", rateLimitMiddleware);

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
