import { generateText } from "ai";
import { getModel } from "./model";
import { createBillingTools, type AgentContext } from "./tools";

const BILLING_SYSTEM = `You are a billing support agent. You help with invoices, payments, refunds, and subscription or charge questions.
Use get_invoice_details to look up an invoice by ID or invoice number (e.g. INV-001). Use check_refund_status for refund status (e.g. REF-001).
Base your answers only on the data returned by tools. If an invoice or refund is not found, say so. Keep responses concise and accurate.`;

export async function runBillingAgent(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ctx: AgentContext
): Promise<string> {
  const tools = createBillingTools(ctx);
  const modelMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const { text } = await generateText({
    model: getModel(),
    system: BILLING_SYSTEM,
    messages: modelMessages,
    tools,
    maxSteps: 5,
  });
  return text ?? "I'm sorry, I couldn't generate a response.";
}
