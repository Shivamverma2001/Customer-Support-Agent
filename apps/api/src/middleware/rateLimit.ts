/**
 * Phase 6 bonus: in-memory rate limiting by IP.
 * Fixed window: max requests per 1-minute window per key (IP + stream vs api).
 * Exempts /api/health; stream endpoint has a lower limit (20/min) than general API (60/min).
 */
import type { Context, Next } from "hono";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // per window per IP for chat
const MAX_REQUESTS_STREAM = 20; // lower for stream (heavier)

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

function getKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const path = new URL(c.req.url).pathname;
  const isStream = path === "/api/chat/messages/stream";
  return `${ip}:${isStream ? "stream" : "api"}`;
}

function getLimit(path: string): number {
  if (path === "/api/chat/messages/stream") return MAX_REQUESTS_STREAM;
  return MAX_REQUESTS;
}

export async function rateLimitMiddleware(c: Context, next: Next): Promise<void | Response> {
  const path = new URL(c.req.url).pathname;
  if (path === "/api/health") return next();

  const key = getKey(c);
  const limit = getLimit(path);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return c.json(
      { error: "Too many requests", code: 429, retryAfter },
      429,
      { "Retry-After": String(retryAfter) }
    );
  }

  return next();
}
