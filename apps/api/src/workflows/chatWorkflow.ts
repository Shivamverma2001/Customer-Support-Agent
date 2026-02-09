/**
 * Phase 6 bonus: useworkflow.dev integration pattern.
 * See https://useworkflow.dev and https://useworkflow.dev/docs/getting-started/hono
 *
 * This module mirrors the durable workflow pattern: route intent (step 1) then run agent (step 2).
 * To run with Workflow DevKit (suspend/resume, retries, observability), run the API with Nitro:
 *   npm i workflow nitro rollup
 *   nitro.config.ts: modules: ["workflow/nitro"], routes: { "/**": "./src/index.ts" }
 *   scripts: "dev": "nitro dev", "build": "nitro build"
 * Then replace the calls below with "use step" functions and wrap in a "use workflow" function.
 */
import type { AgentContext } from "../agents/tools";
import { routeIntent, type RoutedIntent } from "../agents/router";
import { runAgent } from "../agents/runAgent";

export type ChatWorkflowInput = {
  latestMessage: string;
  conversationSummary?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  ctx: AgentContext;
};

/**
 * Sequential steps matching the chat flow. With useworkflow.dev you would:
 * - Add "use workflow" to this function and "use step" to routeIntentStep / runAgentStep.
 * - Use start(chatWorkflow, [input]) from workflow/api in your route handler.
 */
export async function chatWorkflow(input: ChatWorkflowInput): Promise<string> {
  const intent = await routeIntentStep(input.latestMessage, input.conversationSummary);
  const reply = await runAgentStep(intent, input.messages, input.ctx);
  return reply;
}

async function routeIntentStep(latestMessage: string, conversationSummary?: string) {
  return routeIntent(latestMessage, conversationSummary);
}

async function runAgentStep(
  intent: RoutedIntent,
  messages: ChatWorkflowInput["messages"],
  ctx: AgentContext
) {
  return runAgent(intent, messages, ctx);
}
