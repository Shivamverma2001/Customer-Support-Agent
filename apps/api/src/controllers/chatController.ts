import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import * as chatService from "../services/chatService";

/** Optional: scopes conversations to a user; if omitted, demo user is used */
const userIdHeader = "x-user-id";

function getUserId(c: Context): string | undefined {
  return c.req.header(userIdHeader) ?? undefined;
}

export async function listConversations(c: Context) {
  const list = await chatService.listConversations(getUserId(c));
  return c.json({ conversations: list });
}

export async function getConversationById(c: Context) {
  const id = c.req.param("id");
  const conv = await chatService.getConversationById(id, getUserId(c));
  if (!conv) throw new HTTPException(404, { message: "Conversation not found" });
  return c.json(conv);
}

export async function deleteConversation(c: Context) {
  const id = c.req.param("id");
  const deleted = await chatService.deleteConversation(id, getUserId(c));
  if (!deleted) throw new HTTPException(404, { message: "Conversation not found" });
  return c.json({ ok: true }, 200);
}

export async function postMessage(c: Context) {
  const body = await c.req.json().catch(() => null);
  const content = body && typeof body.content === "string" ? body.content.trim() : "";
  const conversationId = body && typeof body.conversationId === "string" ? body.conversationId : null;
  if (!content) throw new HTTPException(400, { message: "content is required" });
  const result = await chatService.sendMessage(conversationId, content, getUserId(c));
  if (!result) throw new HTTPException(404, { message: "Conversation not found" });
  return c.json(
    {
      conversationId: result.conversationId,
      messageId: result.messageId,
      reply: result.reply,
    },
    201
  );
}

/** Phase 4: stream reply with typing indicator. Returns NDJSON stream: { type: 'typing' } | { type: 'chunk', text } | { type: 'done', conversationId, messageId, reply }. */
export async function postMessageStream(c: Context) {
  const body = await c.req.json().catch(() => null);
  const content = body && typeof body.content === "string" ? body.content.trim() : "";
  const conversationId = body && typeof body.conversationId === "string" ? body.conversationId : null;
  if (!content) throw new HTTPException(400, { message: "content is required" });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of chatService.sendMessageStream(conversationId, content, getUserId(c))) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", code: 500, message: String((err as Error).message) }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
