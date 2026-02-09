import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as agentsService from "../services/agentsService";

export async function listAgents(c: Context) {
  const agents = agentsService.listAgents();
  return c.json({ agents });
}

export async function getCapabilities(c: Context) {
  const type = c.req.param("type");
  const cap = agentsService.getCapabilities(type);
  if (!cap) throw new HTTPException(404, { message: "Agent type not found" });
  return c.json(cap);
}
