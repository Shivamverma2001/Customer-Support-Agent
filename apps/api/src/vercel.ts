/**
 * Vercel serverless entry: export Hono app as default.
 * Local dev still uses index.ts with @hono/node-server.
 * No dotenv here: Vercel injects env vars; dotenv uses require("fs") which fails in serverless ESM.
 */
import { app } from "./rpc";
export default app;
