/**
 * Vercel serverless function entry: /api -> Hono app.
 * All routes are under /api/* so the single handler catches everything.
 * Import from dist/ (compiled output); src/ is not available at runtime.
 */
import app from "../dist/vercel.js";
export default app;
