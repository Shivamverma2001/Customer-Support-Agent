/**
 * Vercel serverless function entry: /api -> Hono app.
 * Uses a single bundled file so Node ESM resolves all imports at runtime.
 */
// @ts-ignore - generated .mjs bundle has no declaration file
import app from "../dist/vercel-bundle.mjs";
export default app;
