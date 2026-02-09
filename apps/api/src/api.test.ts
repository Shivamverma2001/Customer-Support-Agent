/**
 * Phase 6 bonus: integration tests for API routes.
 */
import { describe, it, expect } from "vitest";
import { app } from "./rpc";

describe("API", () => {
  it("GET /api/health returns 200 and ok status", async () => {
    const res = await app.request("http://localhost/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string; service?: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBeDefined();
  });

  it("GET /api/agents returns 200 and list of agents", async () => {
    const res = await app.request("http://localhost/api/agents");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { agents?: unknown[] };
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.agents!.length).toBe(3);
    const types = (body.agents as { type: string }[]).map((a) => a.type);
    expect(types).toContain("support");
    expect(types).toContain("order");
    expect(types).toContain("billing");
  });

  it("GET /api/agents/support/capabilities returns tools and intents", async () => {
    const res = await app.request("http://localhost/api/agents/support/capabilities");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tools?: string[]; intents?: string[] };
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools).toContain("query_conversation_history");
  });

  it("unknown route returns 404", async () => {
    const res = await app.request("http://localhost/api/unknown");
    expect(res.status).toBe(404);
  });
});
