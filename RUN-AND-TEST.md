# Run & Test Guide

Step-by-step instructions to run the AI Customer Support app and how to test it.

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (e.g. [Neon](https://neon.tech) free tier, or local install)
- **npm**
- **OpenAI API key** — get one at [platform.openai.com](https://platform.openai.com/api-keys)

---

## Steps to Run

### 1. Install dependencies (from repo root)

```bash
npm install
```

### 2. Configure environment

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env` and set:

| Variable       | Required | Description |
|----------------|----------|-------------|
| `DATABASE_URL` | Yes      | PostgreSQL connection string. Neon: create a project at [neon.tech](https://neon.tech) → Connect → copy the string. Local: `postgresql://USER:PASSWORD@localhost:5432/customer_support?schema=public` |
| `AI_PROVIDER`  | No       | `openai` (default) or `groq`. Use `groq` when OpenAI quota is exceeded. |
| `OPENAI_API_KEY` | Yes (if OpenAI) | Your OpenAI API key |
| `OPENAI_MODEL` | No       | Defaults to `gpt-4o-mini` |
| `GROQ_API_KEY` | Yes (if Groq) | Groq API key — get at [console.groq.com](https://console.groq.com); free tier available. |
| `GROQ_MODEL`  | No       | Defaults to `llama-3.1-8b-instant` |

### 3. Setup database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

From repo root you can run:

```bash
npm run db:push
npm run db:seed
```

### 4. Build API (for Hono RPC types)

```bash
npm run build --workspace=api
```

### 5. Start the app

From **repo root** (runs both API + web):

```bash
npm run dev
```

Or run separately in two terminals:

- **Terminal 1 — API:** `cd apps/api && npm run dev` → http://localhost:3000  
- **Terminal 2 — Web:** `cd apps/web && npm run dev` → http://localhost:5173  

---

## How to Test

### 1. Run unit / integration tests

From repo root or `apps/api`:

```bash
npm run test --workspace=api
```

or:

```bash
cd apps/api && npm run test
```

Tests cover: health endpoint, agents list, support capabilities, 404 for unknown routes.  
No DB or API keys needed — tests use the Hono app directly.

---

### 2. Manual API checks

With the API running (`npm run dev` or `cd apps/api && npm run dev`):

| Check | URL / Method | Expected |
|-------|--------------|----------|
| Health | `GET http://localhost:3000/api/health` | `{ "status": "ok", "service": "customer-support-api" }` |
| List agents | `GET http://localhost:3000/api/agents` | `{ "agents": [{ "type": "support", ... }, { "type": "order", ... }, { "type": "billing", ... }] }` |
| Support capabilities | `GET http://localhost:3000/api/agents/support/capabilities` | `{ "tools": ["query_conversation_history"], "intents": [...] }` |
| List conversations | `GET http://localhost:3000/api/chat/conversations` | `{ "conversations": [...] }` |

---

### 3. Manual UI testing (Chat)

1. Open **http://localhost:5173** in a browser (API must be running).
2. You should see the chat UI with "AI Customer Support", a conversation list, and an input field.

**Sample prompts to try:**

| Prompt | Expected behavior |
|--------|-------------------|
| `Where is my order ORD-001?` | Order agent uses tools, returns tracking info (TRK-001, in_transit). |
| `What's the status of refund REF-001?` | Billing agent returns refund status (approved). |
| `How do I reset my password?` | Support agent answers (possibly uses conversation history tool). |
| `Tell me about invoice INV-001` | Billing agent returns invoice details (paid). |
| `I need help with something random` | Router may route to support or unknown; fallback message. |

You should see:

- Loader words cycling ("Thinking…", "Searching…", etc.) while waiting.
- Streamed reply appearing chunk by chunk.
- Messages saved in conversation list; selecting a conversation shows history.

---

### 4. Test streaming endpoint directly

```bash
curl -X POST http://localhost:3000/api/chat/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"content":"Where is order ORD-001?","conversationId":null}'
```

Expected NDJSON output (one line per event):

```
{"type":"typing"}
{"type":"chunk","text":"Order "}
{"type":"chunk","text":"ORD-001 "}
...
{"type":"done","conversationId":"...","messageId":"...","reply":"..."}
```

---

### 5. Test rate limiting (optional)

Send many requests in a short time to `/api/chat/messages/stream` or general API. When the limit is exceeded, you should get:

- Status: 429
- Body: `{ "error": "Too many requests", "code": 429, "retryAfter": ... }`
- Header: `Retry-After`

(Health endpoint `/api/health` is exempt.)

---

## Quick reference

| Item | URL / Command |
|------|---------------|
| Web UI | http://localhost:5173 |
| API base | http://localhost:3000 |
| Health | http://localhost:3000/api/health |
| Run tests | `npm run test --workspace=api` |
| Run dev | `npm run dev` (from root) |

---

## Troubleshooting

- **"Failed to send message"** — Ensure `OPENAI_API_KEY` (if using OpenAI) or `GROQ_API_KEY` (if using Groq) is set in `apps/api/.env`. If OpenAI quota is exceeded, set `AI_PROVIDER=groq` and add `GROQ_API_KEY`.
- **DB connection error** — Check `DATABASE_URL`; ensure DB exists (Neon project or `createdb customer_support`).
- **Web can't reach API** — In dev, Vite proxies `/api` to the API. Ensure both API and web are running.
- **Tests fail** — Run `npm run build --workspace=api` first so types are built.
