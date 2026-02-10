import { generateText } from "ai";
import { getModel } from "./model";

export type RoutedIntent = "support" | "order" | "billing" | "unknown";

const VALID_INTENTS: RoutedIntent[] = ["support", "order", "billing", "unknown"];

const ROUTER_SYSTEM = `You are a classifier for a customer support system. Given the user's message (and optional recent conversation context), classify the intent into exactly one of:
- support: general help, FAQs, how-to, troubleshooting, product questions, account help
- order: order status, tracking, delivery, modifications, cancellations, shipping
- billing: payments, invoices, refunds, subscriptions, charges, payment methods

Reply with ONLY one word: support, order, billing, or unknown. No punctuation, no explanation. Use "unknown" only if the message is unclear, off-topic, or doesn't fit the above.`;

/** Classify user intent from the latest message and optional conversation summary. Uses generateText (no json_schema) so models like llama-3.1-8b-instant work. */
export async function routeIntent(latestMessage: string, conversationSummary?: string): Promise<RoutedIntent> {
  const prompt = conversationSummary
    ? `Recent context:\n${conversationSummary}\n\nLatest user message: ${latestMessage}`
    : latestMessage;
  const { text } = await generateText({
    model: getModel(),
    system: ROUTER_SYSTEM,
    prompt,
  });
  const raw = (text ?? "").trim().toLowerCase().replace(/[.,;!?\s]+$/, "");
  const intent = VALID_INTENTS.find((v) => raw === v) ?? "unknown";
  return intent;
}
