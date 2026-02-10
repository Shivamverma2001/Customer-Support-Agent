import { prisma } from "../lib/prisma";

/** Default demo user email for Phase 2 when no x-user-id */
const DEMO_EMAIL = "demo@example.com";

/** Phase 6 bonus: context compaction — cap messages sent to the model to avoid token overflow. */
const MAX_CONTEXT_MESSAGES = 25;

async function getOrCreateDemoUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo User" },
  });
  return user.id;
}

export async function listConversations(userId?: string) {
  const uid = userId ?? (await getOrCreateDemoUserId());
  const list = await prisma.conversation.findMany({
    where: { userId: uid },
    orderBy: { updatedAt: "desc" },
    select: { id: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } },
  });
  return list.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messageCount: c._count.messages,
  }));
}

export async function getConversationById(conversationId: string, userId?: string) {
  const uid = userId ?? (await getOrCreateDemoUserId());
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: uid },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conv) return null;
  return {
    id: conv.id,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Last N messages as text for agent context (Phase 3: query conversation history tool). */
export async function getConversationHistoryForAgent(
  conversationId: string,
  userId?: string,
  limit = 20
): Promise<string | null> {
  const conv = await getConversationById(conversationId, userId);
  if (!conv) return null;
  const last = conv.messages.slice(-limit);
  return last.map((m) => `[${m.role}]: ${m.content}`).join("\n");
}

export async function deleteConversation(conversationId: string, userId?: string) {
  const uid = userId ?? (await getOrCreateDemoUserId());
  const deleted = await prisma.conversation.deleteMany({
    where: { id: conversationId, userId: uid },
  });
  return deleted.count > 0;
}

export async function createMessage(
  conversationId: string | null,
  content: string,
  role: "user" | "assistant",
  userId?: string
) {
  const uid = userId ?? (await getOrCreateDemoUserId());
  let convId = conversationId;
  if (!convId) {
    const conv = await prisma.conversation.create({
      data: { userId: uid },
    });
    convId = conv.id;
  } else {
    const existing = await prisma.conversation.findFirst({ where: { id: convId, userId: uid } });
    if (!existing) return null;
  }
  const message = await prisma.message.create({
    data: { conversationId: convId, role, content },
  });
  return { conversationId: convId, messageId: message.id, createdAt: message.createdAt.toISOString() };
}

/** Phase 3: Router → sub-agent with tools; persist user + assistant message. */
export async function sendMessage(conversationId: string | null, content: string, userId?: string) {
  const userMsg = await createMessage(conversationId, content, "user", userId);
  if (!userMsg) return null;

  const conv = await getConversationById(userMsg.conversationId, userId);
  if (!conv) return null;

  const { routeIntent } = await import("../agents/router");
  const { runAgent } = await import("../agents/runAgent");

  const allMessages = conv.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const messages = allMessages.slice(-MAX_CONTEXT_MESSAGES);
  const latestMessage = content;
  const conversationSummary =
    messages.length > 1
      ? messages
          .slice(0, -1)
          .map((m) => `[${m.role}]: ${m.content}`)
          .join("\n")
      : undefined;

  const intent = await routeIntent(latestMessage, conversationSummary);
  const ctx = { conversationId: userMsg.conversationId, userId };
  const reply = await runAgent(intent, messages, ctx);

  await createMessage(userMsg.conversationId, reply, "assistant", userId);
  return {
    conversationId: userMsg.conversationId,
    messageId: userMsg.messageId,
    reply,
  };
}

/** Phase 4: stream event types (typing indicator, text chunks, done with persistence, error). */
export type StreamEvent =
  | { type: "typing" }
  | { type: "chunk"; text: string }
  | { type: "done"; conversationId: string; messageId: string; reply: string }
  | { type: "error"; code: number; message: string };

/** Phase 4: async generator that yields typing, then chunks, then done; persists assistant message on done. */
export async function* sendMessageStream(
  conversationId: string | null,
  content: string,
  userId?: string
): AsyncGenerator<StreamEvent, void, undefined> {
  const userMsg = await createMessage(conversationId, content, "user", userId);
  if (!userMsg) {
    yield { type: "error", code: 404, message: "Conversation not found" };
    return;
  }

  const conv = await getConversationById(userMsg.conversationId, userId);
  if (!conv) {
    yield { type: "error", code: 404, message: "Conversation not found" };
    return;
  }

  const { routeIntent } = await import("../agents/router");
  const { runAgentStream } = await import("../agents/runAgent");

  const allMessages = conv.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const messages = allMessages.slice(-MAX_CONTEXT_MESSAGES);
  const latestMessage = content;
  const conversationSummary =
    messages.length > 1
      ? messages
          .slice(0, -1)
          .map((m) => `[${m.role}]: ${m.content}`)
          .join("\n")
      : undefined;

  const intent = await routeIntent(latestMessage, conversationSummary);
  const ctx = { conversationId: userMsg.conversationId, userId };

  yield { type: "typing" };

  const outcome = runAgentStream(intent, messages, ctx);

  if (outcome.type === "fallback") {
    yield { type: "chunk", text: outcome.text };
    const assistant = await createMessage(userMsg.conversationId, outcome.text, "assistant", userId);
    yield {
      type: "done",
      conversationId: userMsg.conversationId,
      messageId: assistant?.messageId ?? "",
      reply: outcome.text,
    };
    return;
  }

  let reply = "";
  const result = await Promise.resolve(outcome.result);
  try {
    const fullStream = (result as { fullStream?: AsyncIterable<{ type: string; text?: string }> }).fullStream;
    if (fullStream) {
      for await (const part of fullStream) {
        if (part.type === "text-delta" && part.text) {
          reply += part.text;
          yield { type: "chunk", text: part.text };
        }
      }
    } else {
      for await (const chunk of result.textStream) {
        reply += chunk;
        yield { type: "chunk", text: chunk };
      }
    }
  } catch (err) {
    console.error("[chatService] stream error:", err);
  }
  const finalText = await result.text;
  let fullReply = (finalText ?? reply) || "";
  if (!fullReply) {
    // Fallback: stream returned no text (e.g. tool-only response), use non-streaming agent
    const { runAgent } = await import("../agents/runAgent");
    const fallbackText = await runAgent(intent, messages, ctx);
    fullReply = fallbackText || "I'm sorry, I couldn't generate a response.";
    yield { type: "chunk", text: fullReply };
  }
  const assistant = await createMessage(userMsg.conversationId, fullReply, "assistant", userId);
  yield {
    type: "done",
    conversationId: userMsg.conversationId,
    messageId: assistant?.messageId ?? "",
    reply: fullReply,
  };
}
