import { generateText } from "ai";
import { getModel } from "./model";
import { createSupportTools, type AgentContext } from "./tools";

const SUPPORT_SYSTEM = `You are a friendly customer support agent. You help with general questions, FAQs, troubleshooting, and account issues.
Use the query_conversation_history tool when the user refers to earlier messages or when you need context from this conversation.
Keep responses concise and helpful. If you don't know something, say so and suggest contacting support.`;

export async function runSupportAgent(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<string> {
  const tools = createSupportTools(ctx);
  const modelMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const { text } = await generateText({
    model: getModel(),
    system: SUPPORT_SYSTEM,
    messages: modelMessages,
    tools,
    maxSteps: 5,
  });
  return text ?? "I'm sorry, I couldn't generate a response.";
}
