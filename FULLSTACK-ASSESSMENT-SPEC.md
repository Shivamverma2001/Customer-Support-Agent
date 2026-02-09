# Full Stack Engineer Assessment – Specification & Reference

**Fullstack Engineering Assessment** — Single reference document: requirements from the assessment PDF + logic/rationale from analysis.

**Current implementation:** Turborepo monorepo with **apps/api** (Hono + Prisma + PostgreSQL) and **apps/web** (React/Vite, Tailwind CSS). **Hono RPC** in place. Phases 1–5 done; **Phase 6 submission** (README + setup done; Loom by author) (chat UI: conversation list, messages, streamed replies, “agent is typing” indicator).

---

## Overview

Build a **fullstack AI-powered customer support system** with a **multi-agent architecture**:

- A **router agent** analyzes incoming queries and delegates to specialized **sub-agents**.
- Each sub-agent has access to **relevant tools** (backed by DB).
- The system maintains **conversational context** across messages for accurate, personalized responses.

| Item | Detail |
|------|--------|
| **Time** | 12–48 hours |
| **Submission** | GitHub repo + Loom demo |

---

## Phases (recommended order)

Work in these phases so you cover everything in a logical order and don’t block yourself.

| Phase | Name | What you cover | Done when |
|-------|------|----------------|-----------|
| **1** | **Foundation** | Repo, tech stack, DB schema, seed data, migrations | You have a runnable app with real data in PostgreSQL. *(Done: monorepo, apps/api, apps/web, seed, GET /api/health.)* |
| **2** | **Backend skeleton** | Controller–service pattern, error middleware, all 7 API routes (stub responses OK first) | Every route exists and returns something; architecture is in place. *(Done.)* |
| **3** | **Agents & tools** | Router (classify → delegate → fallback), all 3 sub-agents, each with tools that read from DB; conversation context | Router picks the right agent; each agent can call its tools and get real data. |
| **4** | **Chat flow & persistence** | POST /messages: full flow (router → agent → tools → reply), persist conversations & messages (req. 10), streaming (req. 9), typing indicator (req. 11) | Sending a message returns a grounded, streamed reply and everything is saved. |
| **5** | **Frontend** | Basic UI (React/Vite): chat, conversation list, send message, show replies, streaming + “agent is typing” | A user can chat through the UI and see streaming + typing. |
| **6** | **Polish & submit** | Bonus items (if any), README, Loom walkthrough, setup instructions (req. 12–14) | Repo is submittable and reviewers can run it. |

**Why this order:** Phase 1 gives you data (tools need it). Phase 2 gives you API shape and architecture. Phase 3 implements the core multi-agent logic. Phase 4 wires chat + persistence + streaming. Phase 5 adds the UI. Phase 6 is submission readiness.

---

## Todo list (tick as you go)

Use this list so you don’t forget anything. Check off each item when done. **Phase** labels match the phases above.

### Phase 1 — Setup & project

- [x] Initialize repo (frontend + backend; or monorepo if going for bonus) → **Turborepo: apps/api, apps/web**
- [x] Tech stack in use: **Frontend** React/Vite, **Backend** Hono, **Database** PostgreSQL, **ORM** Prisma or Drizzle, **AI** Vercel AI SDK (add in Phase 3)
- [x] (Bonus) Hono RPC + Turborepo monorepo for end-to-end type safety → **api exports AppType (rpc.ts), web uses `hc<AppType>`**

### Phase 1 — Database

- [x] Define schema: conversations, messages, orders, deliveries, invoices, refunds (or equivalent) → **apps/api/prisma/schema.prisma**
- [x] **Seed (req. 6):** sample **orders**, **payments** (or invoices/refunds), **conversations** (and messages) → **apps/api/prisma/seed.ts**
- [x] Run migrations and verify seed data (schema + seed = requirements 5 & 6 covered) → **prisma db push + db:seed**

### Phase 2 — Architecture (req. 1–3)

- [x] **1. Controller–Service pattern** — controllers thin (HTTP only); logic in services → **controllers/**, **services/**
- [x] **2. Clean separation of concerns** — distinct layers: routes → controllers → services → data/agents
- [x] **3. Error-handling middleware** — catch errors, consistent JSON, status codes, logging (“throughout”) → **middleware/errorHandler.ts**

### Phase 2 — API routes (all under `/api`)

- [x] **POST** `/api/chat/messages` — send message (stub reply); persist user + assistant message → **chatController.postMessage**
- [x] **GET** `/api/chat/conversations/:id` — get conversation history → **chatController.getConversationById**
- [x] **GET** `/api/chat/conversations` — list user conversations → **chatController.listConversations**
- [x] **DELETE** `/api/chat/conversations/:id` — delete conversation → **chatController.deleteConversation**
- [x] **GET** `/api/agents` — list available agents → **agentsController.listAgents**
- [x] **GET** `/api/agents/:type/capabilities` — get agent capabilities → **agentsController.getCapabilities**
- [x] **GET** `/api/health` — health check → **apps/api/src/rpc.ts**

### Phase 3 — Multi-agent system

- [x] **Router (parent):** analyzes incoming query, classifies intent, delegates to correct sub-agent → **agents/router.ts**
- [x] **Router:** fallback for unclassified / low-confidence queries → **runAgent** fallback for `unknown`
- [x] **Support agent** — general support, FAQs, troubleshooting; tool: **query conversation history** (from DB)
- [x] **Order agent** — order status, tracking, modifications, cancellations; tools: **fetch order details**, **check delivery status** (from DB)
- [x] **Billing agent** — payment issues, refunds, invoices, subscription queries; tools: **get invoice details**, **check refund status** (from DB)
- [x] **Req. 4:** Every sub-agent has tools (no agent without tools)
- [x] **Req. 5:** Tools query **actual data from database** (orderService, billingService, chatService)
- [x] **Req. 7:** Conversation context — agents receive **User’s previous contexts** (prior messages in thread)

### Phase 4 — API & Database (req. 8–11)

- [x] **8.** RESTful API for chat interactions (POST /messages, POST /messages/stream)
- [x] **9.** (Recommended) Streaming responses → POST /api/chat/messages/stream (NDJSON: typing, chunk, done)
- [x] **10.** Conversation and message persistence (user + assistant in sendMessage and sendMessageStream)
- [x] **11.** Real-time “agent is typing” indicator

### Phase 5 — Frontend

- [x] **Basic UI** (React/Vite + Tailwind): chat interface, conversation list, send message, show replies
- [x] Show streaming reply and “agent is typing” state

### Phase 6 — Bonus (optional)

- [x] Rate limiting implementation → middleware/rateLimit.ts
- [x] Usage of https://useworkflow.dev → workflows/chatWorkflow.ts (pattern; full durability with Nitro)
- [x] Unit / integration tests → Vitest, api.test.ts
- [x] Context management / Compaction → MAX_CONTEXT_MESSAGES = 25 in chatService
- [x] Show reasoning / loader words (Thinking…, Searching… in App.tsx), or loader with words like “Thinking”, “Searching”
- [ ] Deployed live demo

### Phase 6 — Submission (req. 12–14)

- [x] **12.** GitHub repository with README → **README.md** (overview, setup, layout, submission)
- [ ] **13.** Loom video walkthrough (2–5 min) — author to record: run app, show chat/streaming, walk through code (routing, agents, tools)
- [x] **14.** Working setup instructions → **README.md** (env, DB, seed, install, build api, run dev; reviewers can run locally)

**Reminders:** Evaluation focus = backend architecture, multi-agent design, tool implementation, API design. Important Note = your architecture and implementation should be yours (you’ll explain your decisions).

### Project layout (current)

```
assignment/
├── apps/
│   ├── api/                 # Hono, Prisma, PostgreSQL
│   │   ├── prisma/          # schema.prisma, seed.ts
│   │   └── src/             # index.ts, rpc.ts (routes), controllers/, services/, middleware/, lib/, agents/
│   └── web/                 # React + Vite
│       └── src/             # App.tsx, api-client.ts (hc<AppType>)
├── package.json             # workspaces, turbo scripts
├── turbo.json
├── FULLSTACK-ASSESSMENT-SPEC.md
└── README.md
```

---

## Requirements

### Architecture

1. **Controller–Service pattern**  
   - Controllers: HTTP only (parse request, call service, return response).  
   - Services: business logic, DB, agent orchestration.  
   - Keeps HTTP and domain logic separate; easier to test and change.

2. **Clean separation of concerns**  
   - Distinct layers: routes → controllers → services → data/agents.  
   - Easier to swap DB, AI provider, or UI without touching everything.

3. **Proper error handling throughout**  
   - **Recommended:** use a middleware to catch errors, map to HTTP status and consistent JSON, and log.  
   - One place for error handling instead of try/catch in every route.

---

### Multi-Agent System

#### Router Agent (Parent)

- **Role:** Analyze incoming customer queries; classify intent; delegate to the right sub-agent.
- **Fallback:** Handle unclassified or low-confidence queries (e.g. generic support or “I’m not sure” response).
- **Logic:** Single entry point for routing; intent classification (e.g. LLM with prompt or structured tool returning `support | order | billing | unknown`).

#### Sub-Agents (implement all three)

| Agent | Handles | Tools |
|-------|--------|--------|
| **Support Agent** | General support inquiries, FAQs, troubleshooting | Query conversation history |
| **Order Agent** | Order status, tracking, modifications, cancellations | Fetch order details, check delivery status |
| **Billing Agent** | Payment issues, refunds, invoices, subscription queries | Get invoice details, check refund status |

**Agent Tools (requirements 4–7):**

4. Each sub-agent must have tools.  
5. Tools should query actual data from the database (mock data is enough).  
6. Seed database with sample orders, payments, conversations.  
7. The agents should have a conversation context. On the User’s previous contexts.

---

### Agent Tools (detail)

- **Each sub-agent must have tools** so responses are grounded in real data, not only model output.
- **Tools query the DB** via your service layer (no raw SQL in the tool definition); use Prisma/Drizzle.
- **Seed the database** with sample:
  - Orders  
  - Payments / invoices / refunds  
  - Conversations / messages  
- **Conversation context:** When the user sends a message, the agent sees prior messages (and optionally prior tool results) for that conversation.

**Tool contract (per tool):**

- **Input:** Parameters (e.g. `orderId`, `conversationId`) — from LLM and/or request context; validate (e.g. Zod).
- **Output:** Short text or small structured summary for the LLM (e.g. “Order 12345: shipped on …”).
- **Flow:** DB ← ORM ← service ← tool handler → string → agent. Tools are read-only for the assessment.

---

### API & Database (requirements 8–11)

8. RESTful API endpoints for chat interactions.  
9. Streaming responses from AI agents (recommended).  
10. Conversation and message persistence.  
11. Real-time agent is typing indicator.

---

## API Routes

```
/api
├── /chat
│   ├── POST   /messages              # Send message (JSON reply)
│   ├── POST   /messages/stream       # Send message (NDJSON stream: typing, chunk, done)
│   ├── GET    /conversations/:id     # Get conversation history
│   ├── GET    /conversations         # List user conversations
│   └── DELETE /conversations/:id     # Delete conversation
├── /agents
│   ├── GET    /agents                # List available agents
│   └── GET    /agents/:type/capabilities  # Get agent capabilities
└── /health                           # Health check
```

**Intent of each:**

- **POST /api/chat/messages** – Send message; return full JSON reply; persist user + assistant message.
- **POST /api/chat/messages/stream** – Send message; return NDJSON stream: `{ type: "typing" }`, `{ type: "chunk", text }`, `{ type: "done", conversationId, messageId, reply }`; persist on done.
- **GET /api/chat/conversations/:id** – Return one conversation and its messages (for UI and for “query conversation history”).
- **GET /api/chat/conversations** – List conversations for the user.
- **DELETE /api/chat/conversations/:id** – Delete a conversation.
- **GET /api/agents** – List agents (e.g. support, order, billing) with names/ids.
- **GET /api/agents/:type/capabilities** – Describe what an agent can do (tools, intents).
- **GET /api/health** – Liveness/readiness (e.g. app + DB).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Basic UI (React / Vite) |
| Backend | Hono.dev |
| Database | PostgreSQL |
| ORM | Prisma or Drizzle |
| AI | Vercel AI SDK |

---

## Bonus Points

### Hono RPC + Monorepo Setup (+30 points guaranteed) — *Done*

- Set up a monorepo with **Hono RPC** for end-to-end type safety between backend and frontend. → **apps/api** exports `AppType` from `src/rpc.ts`; **apps/web** uses `import type { AppType } from "api/rpc"` and `hc<AppType>(baseUrl)` in `src/api-client.ts`.
- Use **Turborepo** for monorepo management: https://turborepo.dev/ → **Root package.json workspaces, turbo.json; run from root: npm run dev, npm run build.**

### Other bonuses

1. Rate limiting implementation.  
2. Usage of https://useworkflow.dev  
3. Unit / integration tests.  
4. Context management / Compaction (when running out of tokens).  
5. Show reasoning of the AI, or a loader of random words like “Thinking”, “Searching”.  
6. Deployed live demo.

---

## Evaluation Focus

- Backend architecture and code organization.  
- Multi-agent system design and routing logic.  
- Tool implementation and data flow.  
- API design and error handling.

---

## Submission (requirements 12–14)

- [x] **12. GitHub repository** with README.  
- [ ] **13. Loom video walkthrough** (2–5 min) — author to record: walk through app and code; explain routing, tools, and main decisions.  
- [x] **14. Working setup instructions** — env vars, DB setup, seed, install, run (in README; reviewers can run locally).

---

## Important Note

> We don’t want you to vibe code this entirely. Your submission will be thoroughly reviewed, and we’ll ask you to walk through your code and explain your decisions. Please write the code yourself and AI assistants are fine for help, but the architecture and implementation should be yours.

---

## Quick Reference: Router & Tools

**Router:** Input = user message + optional recent history. Output = which sub-agent (or fallback). Use LLM with a prompt or structured tool (e.g. `agent_type: support | order | billing | unknown`). On `unknown` or low confidence → fallback path.

**Support agent:** Tool = query conversation history (input: `conversationId`; output: summary or last N messages).

**Order agent:** Tools = fetch order details, check delivery status (input: e.g. `orderId`; output: short summary from DB).

**Billing agent:** Tools = get invoice details, check refund status (input: e.g. `invoiceId` / `refundId`; output: short summary from DB).

All tools: call **service layer** → service uses ORM → return concise text for the LLM.

---

## Phase 3 & 4 implementation review (current)

- **Spec alignment:** Router classifies intent (support | order | billing | unknown); fallback message for unknown; all three sub-agents have DB-backed tools; conversation context passed as full message history + optional summary to router. GET /api/agents and GET /api/agents/:type/capabilities match the three agents and tool names.
- **Layers:** Routes → controllers → services (chatService orchestrates; orderService, billingService, agents/*). Tools call services only; no Prisma in agent code.
- **User scoping:** Optional `x-user-id` applied in chatController and passed through sendMessage → createMessage and agent context; order/billing tools use same userId (or demo user when header omitted). Demo user created by seed and by chatService.getOrCreateDemoUserId when creating conversations.
- **Persistence:** User and assistant messages persisted in sendMessage and sendMessageStream (req. 10).
- **Phase 4:** POST /api/chat/messages/stream returns NDJSON.
- **Phase 5:** apps/web: Tailwind CSS; conversation list (sidebar), message list, send input; POST /messages/stream with NDJSON parsing; “agent is typing” bubble and streamed chunks; auto-scroll to bottom on new messages and streaming updates. Phase 4 detail: `typing`, `chunk`, `done` (always sent; `messageId` empty if assistant persist failed); `error` events include `code` (e.g. 404, 500). Sub-agents use streamText; typing event sent before chunks.
- **Notes:** If the LLM or router throws (e.g. missing OPENAI_API_KEY, network error), the user message is already saved but no assistant message is written; the API returns 5xx and the conversation has an unresponded user message. Consider in Phase 4: catch errors and persist a generic “Something went wrong” assistant message, or document that reviewers must set OPENAI_API_KEY. Set OPENAI_API_KEY (and optionally OPENAI_MODEL) in apps/api/.env for POST /api/chat/messages to work.

---

## Coverage checklist (PDF vs this doc)

Every item from the assessment PDF is covered above. Quick verification:

| PDF section | Item | Where in this doc |
|-------------|------|-------------------|
| **Phases** | Recommended order: Foundation → Backend skeleton → Agents & tools → Chat flow → Frontend → Polish & submit | Phases (recommended order) |
| **Overview** | Fullstack, AI support, multi-agent, router → sub-agents, relevant tools, conversational context | Overview |
| | Time 12–48 hours | Overview table |
| | Submission: GitHub repo + Loom demo | Overview table |
| **Architecture** | 1. Controller–Service pattern | Requirements → Architecture |
| | 2. Clean separation of concerns | Requirements → Architecture |
| | 3. Proper error handling throughout (middleware recommended) | Requirements → Architecture |
| **Router Agent** | Analyzes incoming queries, classifies intent, delegates to sub-agent | Multi-Agent System → Router |
| | Handles fallback for unclassified queries | Multi-Agent System → Router |
| **Sub-Agents** | Implement all three | Sub-Agents table header |
| | Support: general support, FAQs, troubleshooting; tool: query conversation history | Sub-Agents table |
| | Order: status, tracking, modifications, cancellations; tools: fetch order details, check delivery status | Sub-Agents table |
| | Billing: payment, refunds, invoices, subscriptions; tools: get invoice details, check refund status | Sub-Agents table |
| **Agent Tools** | 4. Each sub-agent must have tools | Agent Tools (4–7) |
| | 5. Tools query actual data from database (mock OK) | Agent Tools (4–7) |
| | 6. Seed DB: orders, payments, conversations | Agent Tools (4–7) + detail |
| | 7. Conversation context / User’s previous contexts | Agent Tools (4–7) |
| **API & Database** | 8. RESTful API for chat | API & Database (8–11) |
| | 9. Streaming responses (Recommended) | API & Database (8–11) |
| | 10. Conversation and message persistence | API & Database (8–11) |
| | 11. Real-time agent is typing indicator | API & Database (8–11) |
| **API Routes** | /api, /chat, POST /messages, GET conversations/:id, GET conversations, DELETE conversations/:id | API Routes tree |
| | /agents, GET /agents, GET /agents/:type/capabilities | API Routes tree |
| | /health (Health check) | API Routes tree |
| **Tech Stack** | Frontend: Basic UI (React / Vite) | Tech Stack table |
| | Backend: Hono.dev | Tech Stack table |
| | Database: PostgreSQL | Tech Stack table |
| | ORM: Prisma / Drizzle | Tech Stack table |
| | AI: Vercel AI SDK | Tech Stack table |
| **Bonus** | Hono RPC + Monorepo Setup (+30), Turborepo | Bonus section |
| | 1. Rate limiting implementation | Other bonuses |
| | 2. Usage of useworkflow.dev | Other bonuses |
| | 3. Unit/integration tests | Other bonuses |
| | 4. Context management / Compaction (tokens) | Other bonuses |
| | 5. Show reasoning or loader (“Thinking”, “Searching”) | Other bonuses |
| | 6. Deployed live demo | Other bonuses |
| **Evaluation Focus** | Backend architecture and code organization | Evaluation Focus |
| | Multi-agent design and routing logic | Evaluation Focus |
| | Tool implementation and data flow | Evaluation Focus |
| | API design and error handling | Evaluation Focus |
| **Submission** | 12. GitHub repo with README | Submission (12–14) |
| | 13. Loom walkthrough (2–5 min) | Submission (12–14) |
| | 14. Working setup instructions | Submission (12–14) |
| **Important Note** | Don’t vibe code; review + walkthrough; your architecture & implementation | Important Note |
| **Closing** | Good luck !! | End of doc |

---

Good luck !!
