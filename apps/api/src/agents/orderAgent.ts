import { generateText, streamText } from "ai";
import { getModel } from "./model";
import { createOrderTools, type AgentContext } from "./tools";
import * as orderService from "../services/orderService";

const ORDER_SYSTEM = `You are an order support agent. You help with order status, tracking, delivery, modifications, and cancellations.
Base your answers only on the data provided in the context. If an order is not found, say so clearly. Keep responses concise and accurate.`;

const ORDER_SYSTEM_WITH_TOOLS = `${ORDER_SYSTEM}
Use fetch_order_details to get order info by order ID or order number (e.g. ORD-001). Use check_delivery_status for tracking and delivery updates.
IMPORTANT: After calling tools, you MUST always respond with a clear, conversational message to the user. Never end without writing a text reply.`;

const toModelMessages = (messages: Array<{ role: string; content: string }>) =>
  messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

/** Extract order refs (e.g. ORD-001) from text */
function extractOrderRefs(text: string): string[] {
  const matches = text.match(/\bORD-[\w-]+\b/gi);
  return [...new Set(matches ?? [])];
}

/** Pre-fetch order + delivery data for prompt injection (avoids tool-only stream) */
async function prefetchOrderContext(latestMessage: string, userId?: string): Promise<string | null> {
  const refs = extractOrderRefs(latestMessage);
  if (refs.length === 0) return null;
  const parts: string[] = [];
  for (const ref of refs) {
    const order = await orderService.getOrderById(ref, userId);
    const delivery = order?.delivery ? await orderService.getDeliveryStatus(ref, userId) : null;
    if (order) {
      parts.push(`Order ${ref}: ${JSON.stringify(order)}`);
      if (delivery?.delivery) parts.push(`Delivery ${ref}: ${JSON.stringify(delivery.delivery)}`);
    } else parts.push(`Order ${ref}: not found`);
  }
  return parts.length > 0 ? `Context from database:\n${parts.join("\n")}` : null;
}

export async function runOrderAgent(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<string> {
  const latest = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const preContext = await prefetchOrderContext(latest, ctx.userId);
  const system = preContext ? `${ORDER_SYSTEM}\n\n${preContext}` : ORDER_SYSTEM_WITH_TOOLS;
  const tools = preContext ? undefined : createOrderTools(ctx);
  const { text } = await generateText({
    model: getModel(),
    system,
    messages: toModelMessages(messages),
    ...(tools && { tools }),
  });
  return text ?? "I'm sorry, I couldn't generate a response.";
}

/** Phase 4: streaming. Pre-fetch order data when ORD-XXX in message to avoid tool-only stream. */
export async function runOrderAgentStream(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<{ textStream: AsyncIterable<string>; text: PromiseLike<string>; fullStream: AsyncIterable<unknown> }> {
  const latest = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const preContext = await prefetchOrderContext(latest, ctx.userId);
  const system = preContext ? `${ORDER_SYSTEM}\n\n${preContext}` : ORDER_SYSTEM_WITH_TOOLS;
  const tools = preContext ? undefined : createOrderTools(ctx);
  return streamText({
    model: getModel(),
    system,
    messages: toModelMessages(messages),
    ...(tools && { tools }),
  });
}
