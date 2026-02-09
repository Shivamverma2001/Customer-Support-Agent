import { prisma } from "../lib/prisma";

/** Default demo user email for Phase 2 when no x-user-id */
const DEMO_EMAIL = "demo@example.com";

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

export async function deleteConversation(conversationId: string, userId?: string) {
  const uid = userId ?? (await getOrCreateDemoUserId());
  const deleted = await prisma.conversation.deleteMany({
    where: { id: conversationId, userId: uid },
  });
  return deleted.count > 0;
}

export async function createMessage(conversationId: string | null, content: string, role: "user" | "assistant") {
  const uid = await getOrCreateDemoUserId();
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

/** Stub: create user message and a placeholder assistant reply (Phase 2). Phase 4 will add real agent flow. */
export async function sendMessage(conversationId: string | null, content: string) {
  const userMsg = await createMessage(conversationId, content, "user");
  if (!userMsg) return null;
  const stubReply = "Thanks for your message. This is a placeholder reply; the AI agent flow will be added in Phase 4.";
  await createMessage(userMsg.conversationId, stubReply, "assistant");
  return {
    conversationId: userMsg.conversationId,
    messageId: userMsg.messageId,
    reply: stubReply,
  };
}
