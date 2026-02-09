import type { RoutedIntent } from "./router";
import { runSupportAgent } from "./supportAgent";
import { runOrderAgent } from "./orderAgent";
import { runBillingAgent } from "./billingAgent";
import type { AgentContext } from "./tools";

const FALLBACK_MESSAGE =
  "I'm not sure how to help with that. You can ask about order status, delivery, invoices, refunds, or general support.";

type Message = { role: "user" | "assistant" | "system"; content: string };

/** Run the appropriate sub-agent for the given intent, with conversation context. Unknown intent uses support agent with fallback message. */
export async function runAgent(
  intent: RoutedIntent,
  messages: Message[],
  ctx: AgentContext
): Promise<string> {
  if (intent === "unknown") return FALLBACK_MESSAGE;
  if (intent === "support") return runSupportAgent(messages, ctx);
  if (intent === "order") return runOrderAgent(messages, ctx);
  if (intent === "billing") return runBillingAgent(messages, ctx);
  return FALLBACK_MESSAGE;
}
