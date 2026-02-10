# AI Customer Support — Architecture, Workflow & File Guide

Use this doc to explain the project: architecture, request flow, database, and where each piece lives.

---

## 1. High-level architecture

```
┌─────────────────┐     HTTP/NDJSON      ┌──────────────────────────────────────────────────┐
│   Web (React)   │ ◄──────────────────► │   API (Hono + Node)                              │
│   Vite + RPC    │                       │   Controllers → ChatService → Router → Agents     │
└─────────────────┘                       └───────────────────────────┬──────────────────────┘
                                                                       │
                                                                       ▼
                                                             ┌─────────────────┐
                                                             │  PostgreSQL     │
                                                             │  (Prisma)       │
                                                             └─────────────────┘
```

- **Monorepo**: Turborepo with `apps/api` (Hono backend) and `apps/web` (React + Vite).
- **API**: Hono app in `apps/api/src`. All chat goes through **chatController** → **chatService** → **router** → **runAgent** → one of Support / Order / Billing agents.
- **AI**: One LLM call for **intent routing** (router), then a second for the **sub-agent** (support, order, or billing). Model is chosen by `AI_PROVIDER` (OpenAI / Groq / Gemini) in `model.ts`.

---

## 2. End-to-end request flow (streaming)

When the user sends a message and the frontend calls **POST /api/chat/messages/stream**:

1. **chatController.postMessageStream**  
   Parses `content` and `conversationId`, gets `userId` from `x-user-id` (or uses demo user). Calls `chatService.sendMessageStream(...)` and pipes the async generator to the response as **NDJSON** (`application/x-ndjson`).

2. **chatService.sendMessageStream**  
   - Persists the **user message** (creates conversation if needed).  
   - Loads conversation and takes last **25 messages** (context compaction).  
   - Calls **router.routeIntent(latestMessage, conversationSummary)** → one of `support` | `order` | `billing` | `unknown`.  
   - Yields `{ type: "typing" }`.  
   - Calls **runAgentStream(intent, messages, ctx)**.  
   - If **unknown** → yields fallback text and `done`.  
   - Otherwise gets the **stream result** (support/order/billing agent), consumes `fullStream` for `text-delta` events, yields `{ type: "chunk", text }` for each delta.  
   - If the stream produced no text (e.g. tool-only), falls back to **runAgent** (non-streaming) to get a reply.  
   - Persists the **assistant message**, then yields `{ type: "done", conversationId, messageId, reply }`.

3. **router.routeIntent**  
   Single **generateText** call with a system prompt that says “reply with only one word: support, order, billing, or unknown”. Normalizes the response and returns a **RoutedIntent**.

4. **runAgentStream** (in runAgent.ts)  
   - **unknown** → returns `{ type: "fallback", text: "..." }`.  
   - **support** → returns `{ type: "stream", result: runSupportAgentStream(...) }`.  
   - **order** → returns `{ type: "stream", result: runOrderAgentStream(...) }` (this one is async, so result is a Promise).  
   - **billing** → returns `{ type: "stream", result: runBillingAgentStream(...) }`.

5. **Sub-agents (support / order / billing)**  
   Each has:  
   - A **system prompt** and optional **tools**.  
   - **Non-streaming**: `generateText` with tools and `stopWhen: stepCountIs(5)`.  
   - **Streaming**: `streamText` with same config; returns an object with `textStream`, `text`, `fullStream`.  
   **Order agent** special case: if the user message contains something like `ORD-001`, it **pre-fetches** order + delivery from the DB and injects that into the system prompt and runs **without tools** so the stream always has text (avoids tool-only streams).

6. **Tools** (tools.ts)  
   - **Support**: `query_conversation_history` → chatService.getConversationHistoryForAgent.  
   - **Order**: `fetch_order_details`, `check_delivery_status` → orderService.  
   - **Billing**: `get_invoice_details`, `check_refund_status` → billingService.  
   All tools receive **AgentContext** (`conversationId`, `userId`) and use it for DB lookups.

7. **Frontend (App.tsx + api-client)**  
   - Calls `postMessageStream({ content, conversationId }, { onEvent })`.  
   - Reads the NDJSON stream, parses each line as JSON, and handles:  
     - `typing` → show “thinking” state.  
     - `chunk` → append text to streaming reply.  
     - `done` → save assistant message, clear streaming, refresh conversation list.  
     - `error` → show error.

**Non-streaming** flow is the same up to chatService, which uses **sendMessage** → **runAgent** (no stream), then persists the assistant message and returns the full reply in the JSON response (used by **POST /api/chat/messages**).

---

## 3. Database structure (Prisma)

**File**: `apps/api/prisma/schema.prisma`

### Entities and relationships

| Model         | Purpose |
|---------------|--------|
| **User**      | User account (e.g. demo@example.com). Conversations, orders, invoices are scoped by `userId`. |
| **Conversation** | One chat thread. Belongs to one User; has many Messages. |
| **Message**   | Single message in a conversation. `role`: "user" \| "assistant", `content`: text. |
| **Order**     | Order record. Has optional **Delivery** (carrier, tracking, status). Referenced by Invoice and Refund. |
| **Delivery**  | Shipping/tracking for one Order (1:1). |
| **Invoice**   | Invoice for a user; can link to Order. Has many Refunds. |
| **Refund**    | Refund request; can link to Invoice and/or Order. |

### Relationships (short)

- **User** → Conversation[], Order[], Invoice[]  
- **Conversation** → Message[]  
- **Order** → Delivery?, Invoice[], Refund[]  
- **Invoice** → Refund[]  
- **Refund** → Invoice?, Order?

### Identifiers used by agents

- **Orders**: `orderNumber` (e.g. `ORD-001`) or `id`.  
- **Invoices**: `invoiceNumber` (e.g. `INV-001`) or `id`.  
- **Refunds**: `refundNumber` (e.g. `REF-001`) or `id`.  

Seed data (`prisma/seed.ts`) creates a demo user, sample conversations/messages, orders (ORD-001, ORD-002, …), deliveries, invoices (INV-001, …), and refunds (REF-001, …) so the tools return real data.

---

## 4. Files and folders — what lives where

### Root

| Path | Use |
|------|-----|
| `package.json` | Workspace root; Turborepo scripts (`dev`, `build`, `db:push`, etc.). |
| `turbo.json` | Turbo pipeline (e.g. build order). |
| `RUN-AND-TEST.md` | How to run API + Web, env vars, seed, test. |
| `FULLSTACK-ASSESSMENT-SPEC.md` | Original spec. |

### apps/api

| Path | Use |
|------|-----|
| **Entry & server** | |
| `src/index.ts` | Starts Hono with `@hono/node-server` on PORT; mounts `app` from `rpc.ts`. |
| `src/rpc.ts` | Hono app: routes, rate limiting, error/notFound handlers. Exports `AppType` for RPC client. |
| **Routes** (in rpc.ts) | |
| | `GET /api/health` — health check. |
| | `POST /api/chat/messages` — non-streaming send message. |
| | `POST /api/chat/messages/stream` — streaming send message (NDJSON). |
| | `GET /api/chat/conversations` — list conversations. |
| | `GET /api/chat/conversations/:id` — get one conversation + messages. |
| | `DELETE /api/chat/conversations/:id` — delete conversation. |
| | `GET /api/agents` — list agent types. |
| | `GET /api/agents/:type/capabilities` — tools + intents for that agent. |
| **Controllers** | |
| `src/controllers/chatController.ts` | Handles chat HTTP: parse body/params, call chatService, return JSON or NDJSON stream. Optional `x-user-id` for user scoping. |
| `src/controllers/agentsController.ts` | Serves agent list and capabilities from agentsService. |
| **Services** (business logic + DB) | |
| `src/services/chatService.ts` | Conversations and messages: list, get by id, delete, create message. **sendMessage** (non-stream) and **sendMessageStream** (stream): route intent → run agent → persist assistant reply. Context compaction (last 25 messages). |
| `src/services/orderService.ts` | getOrderById, getDeliveryStatus (by order id or order number; scoped by userId/demo). |
| `src/services/billingService.ts` | getInvoiceById, getRefundStatus (by id or number; user-scoped). |
| `src/services/agentsService.ts` | Static list of agents and their capabilities (tools + intents). |
| **Agents** (LLM + tools) | |
| `src/agents/model.ts` | **getModel()**: reads `AI_PROVIDER` (openai \| groq \| gemini) and returns the corresponding AI SDK model (OpenAI, Groq, or Google). |
| `src/agents/router.ts` | **routeIntent(latestMessage, conversationSummary?)**: one generateText call; returns support \| order \| billing \| unknown. |
| `src/agents/runAgent.ts` | **runAgent** (non-stream) and **runAgentStream** (stream): dispatch to support/order/billing agent by intent; unknown → fallback message. |
| `src/agents/supportAgent.ts` | Support agent: system prompt + **query_conversation_history** tool; generateText/streamText with stopWhen: stepCountIs(5). |
| `src/agents/orderAgent.ts` | Order agent: if message has e.g. ORD-XXX, **pre-fetches** order+delivery and injects into system prompt (no tools) so stream always has text; else uses **fetch_order_details** and **check_delivery_status**. |
| `src/agents/billingAgent.ts` | Billing agent: **get_invoice_details**, **check_refund_status**; same pattern as support (tools + stopWhen). |
| `src/agents/tools.ts` | **AgentContext** type. createSupportTools, createOrderTools, createBillingTools: each returns an object of `tool()` definitions (inputSchema + execute) that call chatService, orderService, billingService. |
| **Middleware** | |
| `src/middleware/rateLimit.ts` | In-memory rate limit by IP: 60/min general, 20/min for stream; /api/health exempt. |
| `src/middleware/errorHandler.ts` | Central error and 404 handling for Hono. |
| **Workflow (Phase 6 bonus)** | |
| `src/workflows/chatWorkflow.ts` | Encodes the same flow (routeIntent → runAgent) as a sequential workflow for potential useworkflow.dev / Nitro integration. |
| **Infra** | |
| `src/lib/prisma.ts` | PrismaClient singleton. |
| `prisma/schema.prisma` | DB schema (see section 3). |
| `prisma/seed.ts` | Seeds demo user, conversations, messages, orders, deliveries, invoices, refunds. |
| `.env` / `.env.example` | DATABASE_URL, AI_PROVIDER, OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, etc. |

### apps/web

| Path | Use |
|------|-----|
| `src/main.tsx` | React root; mounts App. |
| `src/App.tsx` | Main UI: sidebar (conversation list, new chat, delete), message list, streaming bubble, input + Send. Uses **postMessageStream** and handles typing/chunk/done/error. Loader words while waiting for first chunk. |
| `src/api-client.ts` | **apiClient**: Hono RPC client typed with AppType. **postMessageStream**: POST to /api/chat/messages/stream, read NDJSON, invoke onEvent for each line. |
| `index.html`, `vite.config.ts` | Vite app; in dev, proxy /api to backend. |

---

## 5. Summary for explaining

- **Flow**: User message → API → save user message → **route intent** (one LLM call) → **run the right agent** (second LLM call, with tools or pre-fetched context) → stream or full reply → save assistant message → respond to client.
- **DB**: Users own Conversations and Messages; Orders (with Delivery), Invoices, Refunds are for tools. Seed creates demo user and sample data (ORD-001, INV-001, REF-001, etc.).
- **Files**: **rpc.ts** = routes; **chatController** = HTTP for chat; **chatService** = orchestration + persistence; **router** = intent; **runAgent** = dispatcher; **supportAgent / orderAgent / billingAgent** = sub-agents; **tools.ts** = tool definitions that call services; **model.ts** = which AI provider/model; **orderService / billingService** = DB for orders/invoices/refunds.
- **Streaming**: Controller uses an async generator that yields typing → chunks (from fullStream text-delta) → done; frontend consumes NDJSON and updates UI per event.

You can use this document as a script for a walkthrough or to answer “how does the system work?” and “where is X implemented?”.
