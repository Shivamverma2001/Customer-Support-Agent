import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "./model";

const intentSchema = z.object({
  intent: z.enum(["support", "order", "billing", "unknown"]).describe("Classification of user intent"),
});

export type RoutedIntent = z.infer<typeof intentSchema>["intent"];

const ROUTER_SYSTEM = `You are a classifier for a customer support system. Given the user's message (and optional recent conversation context), classify the intent into exactly one of:
- support: general help, FAQs, how-to, troubleshooting, product questions, account help
- order: order status, tracking, delivery, modifications, cancellations, shipping
- billing: payments, invoices, refunds, subscriptions, charges, payment methods

Reply with only the intent. Use "unknown" only if the message is unclear, off-topic, or doesn't fit the above.`;

/** Classify user intent from the latest message and optional conversation summary. Returns support | order | billing | unknown. */
export async function routeIntent(latestMessage: string, conversationSummary?: string): Promise<RoutedIntent> {
  const prompt = conversationSummary
    ? `Recent context:\n${conversationSummary}\n\nLatest user message: ${latestMessage}`
    : latestMessage;
  const { object } = await generateObject({
    model: getModel(),
    schema: intentSchema,
    system: ROUTER_SYSTEM,
    prompt,
  });
  return object.intent;
}
