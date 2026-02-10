/**
 * Vercel serverless entry: export Hono app as default.
 * Local dev still uses index.ts with @hono/node-server.
 */
import "dotenv/config";
import { app } from "./rpc";
export default app;
