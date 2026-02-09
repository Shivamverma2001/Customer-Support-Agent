/**
 * RPC entry: app + AppType only (no Node/serve).
 * Frontend imports from "api/rpc" for type-safe client so it doesn't pull in Node code.
 */
import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "customer-support-api",
  });
});

export type AppType = typeof app;
export { app };
