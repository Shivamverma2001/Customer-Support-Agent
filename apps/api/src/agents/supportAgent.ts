import { generateText, streamText } from "ai";
import { getModel } from "./model";
import { createSupportTools, type AgentContext } from "./tools";

const SUPPORT_SYSTEM = `You are a friendly customer support agent. You help with general questions, FAQs, troubleshooting, and account issues.
Use the query_conversation_history tool when the user refers to earlier messages or when you need context from this conversation.
Keep responses concise and helpful. If you don't know something, say so and suggest contacting support.`;

const toModelMessages = (messages: Array<{ role: string; content: string }>) =>
  messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

export async function runSupportAgent(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<string> {
  const tools = createSupportTools(ctx);
  const { text } = await generateText({
    model: getModel(),
    system: SUPPORT_SYSTEM,
    messages: toModelMessages(messages),
    tools,
    maxSteps: 5,
  });
  return text ?? "I'm sorry, I couldn't generate a response.";
}

/** Phase 4: streaming; returns stream result for piping to client. */
export function runSupportAgentStream(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
) {
  const tools = createSupportTools(ctx);
  return streamText({
    model: getModel(),
    system: SUPPORT_SYSTEM,
    messages: toModelMessages(messages),
    tools,
    maxSteps: 5,
  });
}
