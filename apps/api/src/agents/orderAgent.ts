import { generateText, streamText } from "ai";
import { getModel } from "./model";
import { createOrderTools, type AgentContext } from "./tools";

const ORDER_SYSTEM = `You are an order support agent. You help with order status, tracking, delivery, modifications, and cancellations.
Use fetch_order_details to get order info by order ID or order number (e.g. ORD-001). Use check_delivery_status for tracking and delivery updates.
Base your answers only on the data returned by tools. If an order is not found, say so clearly. Keep responses concise and accurate.`;

const toModelMessages = (messages: Array<{ role: string; content: string }>) =>
  messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

export async function runOrderAgent(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<string> {
  const tools = createOrderTools(ctx);
  const { text } = await generateText({
    model: getModel(),
    system: ORDER_SYSTEM,
    messages: toModelMessages(messages),
    tools,
    maxSteps: 5,
  });
  return text ?? "I'm sorry, I couldn't generate a response.";
}

/** Phase 4: streaming. */
export function runOrderAgentStream(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
) {
  const tools = createOrderTools(ctx);
  return streamText({
    model: getModel(),
    system: ORDER_SYSTEM,
    messages: toModelMessages(messages),
    tools,
    maxSteps: 5,
  });
}
