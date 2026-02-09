import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Phase 2: Central error handling (recommended middleware).
 * Maps errors to consistent JSON and status codes; logs.
 */
export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message, code: err.status }, err.status);
  }

  console.error("[errorHandler]", err.message, err.stack);

  const status = 500;
  return c.json(
    {
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
      code: status,
    },
    status
  );
}

/** 404 for unknown routes */
export function notFoundHandler(c: Context): Response {
  return c.json({ error: "Not found", code: 404 }, 404);
}
