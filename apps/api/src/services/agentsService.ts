/**
 * Phase 2: Agent list and capabilities (stub data).
 * Phase 3 will wire these to real router/sub-agents.
 */
const AGENTS = [
  { type: "support", name: "Support Agent", description: "General support, FAQs, troubleshooting" },
  { type: "order", name: "Order Agent", description: "Order status, tracking, modifications, cancellations" },
  { type: "billing", name: "Billing Agent", description: "Payment issues, refunds, invoices, subscriptions" },
] as const;

const CAPABILITIES: Record<string, { tools: string[]; intents: string[] }> = {
  support: { tools: ["query_conversation_history"], intents: ["faq", "troubleshooting", "general_support"] },
  order: { tools: ["fetch_order_details", "check_delivery_status"], intents: ["order_status", "tracking", "modifications", "cancellations"] },
  billing: { tools: ["get_invoice_details", "check_refund_status"], intents: ["payments", "refunds", "invoices", "subscriptions"] },
};

export function listAgents() {
  return AGENTS;
}

export function getCapabilities(agentType: string) {
  const cap = CAPABILITIES[agentType];
  if (!cap) return null;
  return cap;
}
