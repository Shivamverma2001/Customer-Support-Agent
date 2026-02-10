/**
 * Vercel serverless function entry: /api -> Hono app.
 * Uses a single bundled file so Node ESM resolves all imports at runtime.
 */
import app from "../dist/vercel-bundle.mjs";
export default app;
