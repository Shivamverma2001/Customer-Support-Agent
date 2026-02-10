/**
 * Vercel serverless function entry: /api -> Hono app.
 * All routes are under /api/* so the single handler catches everything.
 */
import app from "../src/vercel";
export default app;
