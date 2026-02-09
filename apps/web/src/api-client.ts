import type { AppType } from "api/rpc";
import { hc } from "hono/client";

/**
 * Type-safe API client (Hono RPC).
 * In dev, Vite proxies /api to the backend; base URL '' uses same origin.
 */
const baseUrl = typeof window !== "undefined" ? "" : "http://localhost:3000";

// Typed shape for the health endpoint so build succeeds; full RPC types from AppType in IDE
export interface ApiClientShape {
  api: { health: { $get: () => Promise<Response> } };
}
export const apiClient: ApiClientShape = hc<AppType>(baseUrl) as ApiClientShape;
