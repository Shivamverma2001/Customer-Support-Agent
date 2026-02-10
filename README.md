# AI Customer Support

Multi-agent customer support chat: a **router** classifies your message and hands off to **Support**, **Order**, or **Billing** agents. Each agent can use database-backed tools (conversation history, order details, delivery status, invoices, refunds). Built with React + Vite + Tailwind on the frontend and Hono + Prisma + PostgreSQL on the API; chat responses stream in real time.

---

## How it works

1. You send a message in the chat.
2. The **router** decides the intent (support, order, or billing).
3. The right **agent** runs and can call tools (e.g. fetch order ORD-001, check refund REF-001).
4. The reply is **streamed** back with an “agent is typing” indicator.

You can ask things like: “Where is my order ORD-001?”, “What’s the status of refund REF-001?”, or “What did I ask earlier in this chat?”

---

## Product output

### What you see in the UI

- **Conversation list** — All your chats; create a new one or open an existing one.
- **Chat area** — Your messages and the agent’s replies. While the agent is responding, you see “agent is typing” and the reply text streams in word-by-word.
- **Loader** — Before the first chunk, the UI cycles through: “Thinking…”, “Searching…”, “Reading your message…”, “Checking context…”.

### Example exchanges (after seed data)

| You ask | Agent (Order) |
|--------|----------------|
| Where is my order ORD-001? | Looks up order and delivery, then replies with status (e.g. shipped, tracking info, ETA). |

| You ask | Agent (Billing) |
|--------|------------------|
| What’s the status of refund REF-001? | Looks up refund, then replies (e.g. approved, amount, timeline). |
| Show me invoice INV-002 | Returns invoice details (amount, status, etc.). |

| You ask | Agent (Support) |
|--------|------------------|
| What did I ask earlier in this chat? | Uses conversation history and summarizes or references earlier messages. |
| How do I track my order? | General help answer using the support agent. |

### API / stream output

The chat stream endpoint returns NDJSON events:

- `{"type":"typing"}` — Agent is about to reply.
- `{"type":"chunk","text":"…"}` — A piece of the reply (can appear many times).
- `{"type":"done","conversationId":"…","messageId":"…","reply":"…"}` — Full reply and IDs when the stream finishes.

So the **complete product output** is: the **streamed reply text** in the UI plus the **final `done` payload** (full reply, conversation and message IDs) for the frontend to persist or display.

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (e.g. [Neon](https://neon.tech) free tier — no local install required)
- **npm**
- **An AI provider API key** (OpenAI, Groq, or Google Gemini)

---

## Setup

### 1. Install dependencies (from repo root)

```bash
npm install
```

### 2. Environment and database (API)

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. [Neon](https://neon.tech): create a project → Connect → copy the connection string. Local: `postgresql://USER:PASSWORD@localhost:5432/customer_support?schema=public` |
| `AI_PROVIDER` | No | `openai` (default), `groq`, or `gemini` |
| `OPENAI_API_KEY` | If OpenAI | From [platform.openai.com](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `GROQ_API_KEY` | If Groq | From [console.groq.com](https://console.groq.com); free tier available |
| `GROQ_MODEL` | No | Default: `llama-3.1-8b-instant` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If Gemini | From [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Default: `gemini-2.5-flash` |

Then:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

From repo root you can use: `npm run db:push` and `npm run db:seed`.

### 3. Build API (for type-safe frontend calls)

```bash
npm run build --workspace=api
```

(or `cd apps/api && npm run build`)

### 4. Run the app

From **repo root** (API + web):

```bash
npm run dev
```

Or run separately:

- **API:** `cd apps/api && npm run dev` → **http://localhost:3000**
- **Web:** `cd apps/web && npm run dev` → **http://localhost:5173** (Vite proxies `/api` to the API)

- API health: **http://localhost:3000/api/health**
- Chat UI: **http://localhost:5173**

### 5. Local PostgreSQL (optional)

If not using Neon:

```bash
createdb customer_support
```

Then set `DATABASE_URL` in `apps/api/.env`.

---

## Sample data

After `npm run db:seed` in `apps/api`:

- **User:** demo@example.com (used when no `x-user-id` header)
- **Conversations:** 2 with sample messages
- **Orders:** ORD-001 (shipped), ORD-002 (delivered), ORD-003 (pending)
- **Deliveries:** tracking for ORD-001, ORD-002
- **Invoices:** INV-001, INV-002 (paid), INV-003 (pending)
- **Refunds:** REF-001 (approved), REF-002 (pending)

Use these IDs in the chat to try order status, invoices, and refunds.

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
│           └── api-client.ts   # type-safe client + streaming
├── package.json
├── turbo.json
└── README.md
```

---

## Features

- **Backend:** Hono, Prisma, PostgreSQL. Health, chat messages + streaming, conversations (list/get/delete), agents list/capabilities. Router + Support / Order / Billing agents with tools. Streaming via `POST /api/chat/messages/stream` (NDJSON: typing, chunk, done).
- **Frontend:** React, Vite, Tailwind. Conversation list, message list, send input. Streaming with “agent is typing” and auto-scroll.
- **Monorepo:** Turborepo; Hono RPC for type-safe API calls from web to api.
- **Rate limiting:** In-memory by IP (60 req/min API, 20/min stream); 429 with `Retry-After` when exceeded.
- **Tests:** Vitest in `apps/api`; run `npm run test` (or `npm run test:watch`).
- **Context:** Last 25 messages sent to the router/agents to avoid token overflow.
- **Loader text:** UI cycles “Thinking…”, “Searching…”, etc. while waiting for the first stream chunk.

---

## Links

| Link | URL |
|------|-----|
| **Live website** | [AI Customer Support](https://customer-support-agent-web.vercel.app/) |
| **Demo video (Google Drive)** | [Watch demo video](https://drive.google.com/file/d/15bKgmCax7wTbasBNOUg-ELg0AHcZo2gu/view?usp=drive_link) |
| **LinkedIn post** | [View post on LinkedIn](https://www.linkedin.com/posts/shivamverma-sv_ai-multiagentai-fullstackdevelopment-activity-7427046467661357058-pqh8?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAADOQ4akBNBBSuRIpdVpjjXtvdKaakqh8KJ0) |

Replace the placeholder URLs above with your actual links before submission.
