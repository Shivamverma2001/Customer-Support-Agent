# AI Customer Support – Full Stack Assessment

Multi-agent customer support system (router + Support / Order / Billing agents) with React/Vite frontend and Hono API.

**Monorepo:** Turborepo with **Hono RPC** for end-to-end type-safe API calls from the frontend.

## Phase 1 – Foundation (current)

- **Backend (apps/api):** Hono, Prisma, PostgreSQL. Health check at `GET /api/health`. Exports `AppType` for RPC.
- **Frontend (apps/web):** React + Vite. Basic UI; uses type-safe `apiClient.api.health.$get()` (Hono RPC).
- **Database:** Schema for users, conversations, messages, orders, deliveries, invoices, refunds. Seed script for sample data.

## Prerequisites

- Node.js 18+
- PostgreSQL (recommended: [Neon](https://neon.tech) free tier — no local install)
- npm

## Setup

### 1. Install (from repo root)

```bash
npm install
```

This installs dependencies for all workspaces (api + web).

### 2. API: database and env

```bash
cd apps/api
cp .env.example .env
# Edit .env and set DATABASE_URL:
# - Neon: create project at https://neon.tech → Connect → copy connection string
# - Local: DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/customer_support?schema=public"

npx prisma generate
npx prisma db push
npm run db:seed
```

Or from root: `npm run db:push` and `npm run db:seed` (run in api workspace).

### 3. Build API once (for Hono RPC types)

So the web app can resolve type-safe API types, build the api once:

```bash
npm run build --workspace=api
# or: cd apps/api && npm run build
```

### 4. Run dev

From **repo root** (runs both api and web):

```bash
npm run dev
```

Or run separately:

- **API:** `cd apps/api && npm run dev` → http://localhost:3000
- **Web:** `cd apps/web && npm run dev` → http://localhost:5173 (proxies `/api` to API)

Health: **http://localhost:3000/api/health**. Open **http://localhost:5173** to see the UI.

### 5. Local PostgreSQL (optional)

Only if not using Neon: create a DB then set `DATABASE_URL` in `apps/api/.env`.

```bash
createdb customer_support
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/customer_support?schema=public"
```

## Project layout

```
assignment/
├── apps/
│   ├── api/              # Hono API, Prisma, PostgreSQL (exports AppType for RPC)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── index.ts
│   │       └── rpc.ts      # routes + AppType for Hono RPC
│   └── web/              # React + Vite (uses api via workspace + Hono client)
│       └── src/
│           ├── api-client.ts   # type-safe client: hc<AppType>
│           └── App.tsx
├── package.json          # root workspace + turbo scripts
├── turbo.json
├── FULLSTACK-ASSESSMENT-SPEC.md
└── README.md
```

## Hono RPC (bonus)

- **api** exports `AppType` from `src/rpc.ts` (no Node/serve there) so the frontend gets route types without pulling in server code.
- **web** uses `import type { AppType } from "api/rpc"` and `hc<AppType>(baseUrl)` so `apiClient.api.health.$get()` is type-safe. Build api once (`npm run build --workspace=api`) so web can resolve `api/rpc` types.

## Seed data (req. 6)

After `npm run db:seed` in `apps/api/` (or from root with turbo):

- **User:** demo@example.com
- **Conversations:** 2 with sample messages
- **Orders:** ORD-001 (shipped), ORD-002 (delivered), ORD-003 (pending)
- **Deliveries:** tracking for ORD-001, ORD-002
- **Invoices:** INV-001, INV-002 (paid), INV-003 (pending)
- **Refunds:** REF-001 (approved), REF-002 (pending)

## Next (Phases 2–6)

See **FULLSTACK-ASSESSMENT-SPEC.md** for requirements, phases, and todo list.
