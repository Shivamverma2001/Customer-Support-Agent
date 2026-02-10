# AI Customer Support – Full Stack Assessment

Multi-agent customer support system with a **router** that delegates to **Support**, **Order**, and **Billing** agents. Each agent has DB-backed tools. React/Vite + Tailwind frontend with streaming chat; Hono API with Prisma + PostgreSQL.

**Status:** Phases 1–5 done. Ready for submission (README + setup below; Loom walkthrough to be recorded by the author).

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (e.g. [Neon](https://neon.tech) free tier — no local install required)
- **npm**
- **OpenAI API key** (for chat agents)

---

## Setup (so reviewers can run locally)

### 1. Install dependencies (from repo root)

```bash
npm install
```

Installs dependencies for all workspaces (`api` + `web`).

### 2. Environment and database (API)

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Neon: create a project at [neon.tech](https://neon.tech) → Connect → copy the connection string. Local: `postgresql://USER:PASSWORD@localhost:5432/customer_support?schema=public` |
| `AI_PROVIDER` | No | `openai` (default), `groq`, or `gemini`. |
| `OPENAI_API_KEY` | Yes (if OpenAI) | OpenAI API key. Get one at [platform.openai.com](https://platform.openai.com/api-keys). |
| `OPENAI_MODEL` | No | Model name; defaults to `gpt-4o-mini`. |
| `GROQ_API_KEY` | Yes (if Groq) | Groq API key. Get one at [console.groq.com](https://console.groq.com); free tier available. |
| `GROQ_MODEL` | No | Model name; defaults to `llama-3.1-8b-instant`. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (if Gemini) | Gemini API key. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Supports tools. |
| `GEMINI_MODEL` | No | Model name; defaults to `gemini-2.5-flash`. |

Then:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

From repo root you can run: `npm run db:push` and `npm run db:seed` (they run in the api workspace).

### 3. Build API once (for Hono RPC types)

The web app uses type-safe API types from the api package. Build the api once:

```bash
npm run build --workspace=api
```

(or `cd apps/api && npm run build`)

### 4. Run the app

From **repo root** (runs both API and web):

```bash
npm run dev
```

Or run separately:

- **API:** `cd apps/api && npm run dev` → **http://localhost:3000**
- **Web:** `cd apps/web && npm run dev` → **http://localhost:5173** (Vite proxies `/api` to the API)

**Check:**

- API health: **http://localhost:3000/api/health**
- Chat UI: **http://localhost:5173** — open in a browser; you can start a new conversation, send messages, and see streamed replies with an “agent is typing” indicator.

### 5. Local PostgreSQL (optional)

If not using Neon, create a database and set `DATABASE_URL` in `apps/api/.env`:

```bash
createdb customer_support
```

---

## What’s implemented

- **Backend (apps/api):** Hono, Prisma, PostgreSQL. Controller–service pattern; error middleware; 7 API routes (health, chat messages + stream, conversations list/get/delete, agents list/capabilities). Router agent + Support / Order / Billing agents with tools (conversation history, order details, delivery status, invoice details, refund status). Streaming via `POST /api/chat/messages/stream` (NDJSON: typing, chunk, done).
- **Frontend (apps/web):** React, Vite, Tailwind CSS. Chat UI: conversation list, message list, send input. Uses streaming endpoint; shows “agent is typing” and streamed reply; auto-scroll to bottom.
- **Monorepo:** Turborepo; Hono RPC for type-safe API calls from web to api.

See **FULLSTACK-ASSESSMENT-SPEC.md** for the full requirement list, phases, and checklist.

---

## Project layout

```
assignment/
├── apps/
│   ├── api/                    # Hono API, Prisma, PostgreSQL
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── index.ts        # server entry
│   │       ├── rpc.ts          # routes + AppType (Hono RPC)
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── agents/         # router, support/order/billing agents, tools
│   │       ├── middleware/
│   │       └── lib/
│   └── web/                    # React + Vite + Tailwind
│       └── src/
│           ├── App.tsx         # chat UI
│           └── api-client.ts   # type-safe client + postMessageStream
├── package.json               # workspaces, turbo scripts
├── turbo.json
├── FULLSTACK-ASSESSMENT-SPEC.md
└── README.md
```

---

## Seed data (req. 6)

After `npm run db:seed` in `apps/api/` (or via root/turbo):

- **User:** demo@example.com (used when no `x-user-id` header)
- **Conversations:** 2 with sample messages
- **Orders:** ORD-001 (shipped), ORD-002 (delivered), ORD-003 (pending)
- **Deliveries:** tracking for ORD-001, ORD-002
- **Invoices:** INV-001, INV-002 (paid), INV-003 (pending)
- **Refunds:** REF-001 (approved), REF-002 (pending)

You can ask the chat e.g. “Where is my order ORD-001?” or “What’s the status of refund REF-001?” to see the Order/Billing agents use the DB.

---

## Submission (req. 12–14)

- **12. GitHub repository with README** — This repo and this README.
- **13. Loom video walkthrough (2–5 min)** — Record a short walkthrough: run the app, show the chat and streaming, then walk through the code (routing, agents, tools, API). Explain main decisions.
- **14. Working setup instructions** — Above: env vars, DB (Neon or local), run seed, install deps, build api once, run dev. Reviewers can follow these steps to run the app locally.

---

## Hono RPC (bonus)

- **api** exports `AppType` from `src/rpc.ts` so the frontend gets route types without pulling in server code.
- **web** uses `import type { AppType } from "api/rpc"` and `hc<AppType>(baseUrl)` for type-safe calls. Build api once so web can resolve `api/rpc` types.

---

## Phase 6 optional bonuses

- **Rate limiting:** In-memory rate limit by IP (60 req/min for API, 20/min for stream). Health check exempt. 429 with `Retry-After` when exceeded. See `apps/api/src/middleware/rateLimit.ts`.
- **Unit / integration tests:** Vitest in `apps/api`; run `npm run test` (or `npm run test:watch`). Tests: health, agents list, capabilities, 404. See `apps/api/src/api.test.ts`.
- **Context compaction:** Last 25 messages only are sent to the router/agents to avoid token overflow. See `MAX_CONTEXT_MESSAGES` in `apps/api/src/services/chatService.ts`.
- **Loader words:** While waiting for the first stream chunk, the UI cycles through “Thinking…”, “Searching…”, “Reading your message…”, “Checking context…”. See `apps/web/src/App.tsx`.
- **useworkflow.dev:** A workflow-style module at `apps/api/src/workflows/chatWorkflow.ts` mirrors the chat flow (route intent → run agent) for durable execution. Full [Workflow DevKit](https://useworkflow.dev) integration (suspend/resume, retries) requires running the API with [Nitro](https://useworkflow.dev/docs/getting-started/hono).
