# AuthorDesk: Author Support & Communication Portal

A two-sided support portal for a self-publishing house:

- **Author portal**: authors see their books and royalties, raise support tickets about a book or their account, and follow replies live.
- **Admin portal**: the operations team works a prioritised queue. Every ticket is **auto-classified and prioritised by an LLM**, comes with an **AI-drafted reply grounded in the company knowledge base**, and can be overridden, assigned, annotated with internal notes and resolved.

> The publisher in this project is a fictional "Inkwell Publishing", configurable via `PUBLISHER_NAME`.

**Live demo:** `<add Vercel URL>` · **API docs:** `<live URL>/docs` · **One-page write-up:** [WRITEUP.md](WRITEUP.md) · **AI design:** [docs/AI.md](docs/AI.md)

---

## Demo credentials

| Role | Email | Password | Why this account is interesting |
|---|---|---|---|
| Admin | `admin@authordesk.dev` | `Admin@123` | Ticket queue, AI drafts, overrides |
| Admin | `ops@authordesk.dev` | `Admin@123` | Second agent, to test assignment |
| Author | `priya.sharma@email.com` | `Author@123` | Two live books, partly paid royalties |
| Author | `kavita.deshmukh@email.com` | `Author@123` | One book **in production** + ₹850 pending (**below ₹1,000 threshold**) |
| Author | `ananya.reddy@email.com` | `Author@123` | Live book, **never paid** (₹2,546 pending) |
| Author | `sneha.kulkarni@email.com` | `Author@123` | Three books incl. one in Cover Design |

All 10 authors from the provided dataset can log in with their dataset email and `Author@123`.

**Try the core flow:**
1. Log in as an author in one browser window and as an admin in a private window.
2. As the author, raise a ticket. Within about 5 seconds it appears in the admin queue and gets an AI category and priority.
3. As the admin, open it. The AI draft appears; edit it and send.
4. The author's ticket updates without a refresh.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript (strict): UI and REST API in one deployable |
| UI | React 19, Tailwind CSS v4, shadcn/ui (Base UI), TanStack Query, React Hook Form |
| Database | MongoDB Atlas (M0 free) via Mongoose 9 |
| Validation | Zod 4: one set of schemas for API validation, client forms and OpenAPI docs |
| Auth | Email/password (bcrypt), JWT in an httpOnly cookie, role-based access control |
| AI | Google Gemini (free tier) → Groq (free tier) → local rule engine |
| Real-time | Visibility-aware 5s polling of a tiny `/updates` delta endpoint |
| Tests | Vitest + mongodb-memory-server (real MongoDB in-process) |
| Hosting | Vercel + MongoDB Atlas |

---

## Running locally

Requirements: Node ≥ 22. MongoDB and Docker are **not** required.

```bash
npm install
cp .env.example .env.local        # then set JWT_SECRET (and AI keys if you have them)

# Option A: no MongoDB install, runs a real mongod on :27017 (data in ./.data)
npm run db:local                  # in a separate terminal
#   MONGODB_URI=mongodb://127.0.0.1:27017/authordesk
# Option B: put your Atlas connection string in MONGODB_URI

npm run seed                      # loads the 10 authors / 18 books + demo admins & tickets
npm run dev                       # http://localhost:3000
```

The app runs fully **without any AI key**. Classification falls back to the rule engine, and the draft panel tells the admin to write manually. Add a free `GEMINI_API_KEY` (https://aistudio.google.com/apikey) to enable AI.

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run seed` | Idempotent reseed (wipes app collections) |
| `npm test` | Unit + integration tests (in-memory MongoDB, no network) |
| `npm run lint` / `typecheck` | Quality gates (also run in CI) |

### Deploying (Vercel + Atlas)
1. Create a free Atlas M0 cluster, a DB user, and allow network access from `0.0.0.0/0` (Vercel has no static IPs).
2. Import the GitHub repo in Vercel. Set the env vars `MONGODB_URI`, `JWT_SECRET`, `PUBLISHER_NAME`, `GEMINI_API_KEY` (and optionally `GROQ_API_KEY`).
3. Seed once from your machine: `MONGODB_URI="<atlas uri>" npm run seed`.

---

## Architecture

```
src/
├── app/                 # ROUTING ONLY: pages + thin API route handlers (/api/v1/**)
├── server/              # backend only (guarded by `server-only`)
│   ├── config/env.ts    #   the only place env/secrets are read (Zod-validated)
│   ├── db/              #   cached connection, Mongoose models, seed
│   ├── http/            #   withApi wrapper, AppError, response helpers
│   ├── auth/            #   JWT + cookie session, password hashing
│   ├── repositories/    #   data access only
│   ├── services/        #   business rules + ownership checks
│   ├── mappers/         #   documents → response DTOs
│   ├── openapi/         #   OpenAPI document from Zod schemas
│   └── ai/              #   providers, LLM client, knowledge base, prompts, classifier, drafter
├── shared/              # isomorphic: enums, Zod request schemas, response DTO types
├── features/            # client feature modules (components + hooks + api.ts per feature)
├── components/          # ui/ (primitives) · common/ (badges, states) · forms/ · layout/
├── constants/ hooks/ lib/ providers/ types/
└── proxy.ts             # page guard (Next 16's renamed middleware): JWT check + role redirects
```

**Request path:** `route.ts → withApi (authenticate → authorise role → validate → handler → error mapping) → service → repository → model`

### Key decisions
- **One Next.js app, not a separate SPA + API.** One deploy, same-origin cookies (no CORS/CSRF juggling), and shared TypeScript types end to end. The REST layer is still a clean, versioned `/api/v1` that any client could use.
- **`withApi` wrapper.** No route can forget authentication, role checks or validation, and every error has the same shape: `{ error: { code, message, details? } }`. Expected failures map to 400/401/403/404/409/422/429/503; unexpected ones are logged and return a generic message with no stack trace.
- **Ownership is enforced in services.** An author requesting another author's ticket gets **404, not 403**, so ticket IDs can't be probed.
- **MongoDB schema:**
  - **Embedded:** the author profile (1:1 with the user) and the message thread (bounded, always read together with its ticket).
  - **Separate collection on purpose:** `ticket_notes`. Internal notes can never leak into an author response because the author query never touches that collection.
  - **Other collections:** `ai_drafts` (cache), `ticket_events` (audit trail and AI-accuracy signal), `ai_usage_logs` (cost tracking, 90-day TTL), `counters` (atomic `T-1001` numbers) and `login_attempts` (TTL-based rate limiting).
  - **Indexes:** a compound index on `{status, priorityRank, createdAt}` backs the "most urgent, oldest first" queue.
- **Real-time via polling, not WebSockets/SSE.** On Vercel's serverless runtime there is no long-lived process to hold sockets or an in-memory event bus. Clients poll `GET /api/v1/updates?since=` every 5 seconds while the tab is visible. The response contains only the ids and timestamps of changed tickets, and clients then refetch only those. This is cheap, indexed, and feels live. Upgrade path: SSE backed by MongoDB change streams on a persistent host.
- **Serverless-safe details:**
  - the Mongo connection is cached on `globalThis` (small pool)
  - rate limiting lives in Mongo rather than memory
  - AI classification runs in `after()`, so ticket creation returns immediately
  - a ticket whose classification was interrupted self-heals when an admin opens it

---

## AI integration (summary; full detail in [docs/AI.md](docs/AI.md))

| Concern | Approach |
|---|---|
| Classification + priority | One small-model call returns `{category, priority, confidence, reasoning}` in JSON mode, validated with Zod. The prompt has category definitions, a priority rubric from the KB and few-shot examples. Runs **after** the response, so ticket creation never waits on AI. Admin overrides are never overwritten. |
| Drafted replies | Layered prompt: static persona, tone rules and hard rules first; then **only the KB section for that ticket's category** plus matching guidance examples; then a **facts block computed in code**; then the last few messages. |
| Facts block | Next payout date, ₹1,000 threshold check, never-paid flag, production stage. The LLM never does arithmetic or invents dates. |
| Cost | Category-scoped KB retrieval instead of the whole KB. Drafts **cached** per ticket and regenerated only on request or when the thread changes. Smallest model for classification. Output token caps. Every call logged with tokens and latency, shown on the admin dashboard. |
| Failure handling | 10s timeout, exponential backoff on 429/5xx, Gemini → Groq fallback, a circuit breaker per provider, then a deterministic rule classifier. Tickets are always created, and admins can always reply manually. |
| Security | Keys only in server env (never `NEXT_PUBLIC_`). Author text is delimited and treated as data (prompt-injection guard). |
| Model choice | Gemini 2.5 Flash-Lite / Flash on the **free tier**: reviewers can reproduce it at no cost, it supports native JSON schema output, and quality is good for short support replies. The `LLMProvider` interface makes switching to a paid Claude or OpenAI model a single-file change. |

---

## API

Interactive docs: **`/docs`** (Swagger UI) · raw spec: **`/api/v1/openapi.json`**

All endpoints are under `/api/v1`. Auth is a session cookie set by `/auth/login`. Successful responses are `{ data }` (lists add `meta` for pagination).

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Email + password → session cookie (rate-limited) |
| POST | `/auth/logout` | any | Clear session |
| GET | `/auth/me` | any | Current user |
| GET | `/me/books` | author | Own books, royalty totals, next payout date |
| GET | `/me/tickets` | author | Own tickets (paginated, newest first) |
| POST | `/me/tickets` | author | Create ticket (book or `GENERAL`); AI classification runs async |
| GET | `/me/tickets/:id` | author | Own ticket + replies (never notes/AI internals) |
| POST | `/me/tickets/:id/messages` | author | Follow-up (reopens a resolved ticket; 409 if closed) |
| GET | `/admin/tickets` | admin | Queue: filter by status, category, priority, assignee, date, text; sort by urgency/newest/oldest |
| GET | `/admin/tickets/:id` | admin | Full detail: author + book context, thread, notes, activity |
| PATCH | `/admin/tickets/:id` | admin | Update status / override category & priority / assign (`"me"`) |
| POST | `/admin/tickets/:id/messages` | admin | Send reply (`aiAssisted` flag for analytics) |
| POST | `/admin/tickets/:id/notes` | admin | Internal note (never visible to author) |
| GET | `/admin/tickets/:id/draft` | admin | Cached or freshly generated AI draft |
| POST | `/admin/tickets/:id/draft/regenerate` | admin | Force a new draft |
| POST | `/admin/tickets/:id/ai/retry` | admin | Re-run classification |
| GET | `/admin/stats` | admin | Queue + AI health metrics |
| GET | `/updates?since=` | any | Changed ticket ids since a timestamp (polling) |

Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "in": "body", "path": "subject", "message": "..." }] } }`

---

## Testing

`npm test` runs everything against a real in-process MongoDB seeded with the provided dataset. No network is used and there are no AI keys, so the fallback paths are exercised too. Coverage includes:

- **Auth and access:** authentication, role checks (403), ownership (404), validation (422)
- **Queue ordering and filters**
- **Override auditing:** admin overrides are recorded in the audit trail
- **Notes privacy:** internal notes never appear in the author's view
- **Royalty and payout calculations**
- **Rule classifier accuracy** against the knowledge-base sample queries
- **Prompt scoping:** the right KB section only, with author text delimited
- **AI client resilience:** provider fallback, circuit breaker, timeouts
- **AI persistence:** classification is saved and admin overrides are never overwritten
- **Draft cache:** hits, invalidation and regeneration

CI (GitHub Actions) runs lint, typecheck, tests and the production build on every push.

---

## Known limitations / what I'd do next

- **Attachments are UI-only:** only file metadata is stored. Next step: S3/R2 presigned uploads with virus scanning.
- **Polling instead of push:** fine at this scale. At larger scale, move to SSE or WebSockets backed by MongoDB change streams.
- **The circuit breaker is per serverless instance** (in-memory). A shared store such as Redis would coordinate it across instances.
- **Classification accuracy is measured offline only** via the override rate. Next steps: a labelled evaluation set from real tickets, prompt A/B testing with `promptVersion`, and feeding admin overrides back as few-shot examples.
- **No email notifications.** Real authors would also want an email when a reply is posted (queue plus a transactional email provider).
- **Auth:** no password reset or email verification. In production, use a managed identity provider or magic links, and add CSRF tokens if the API is used cross-site.
- **No SLA engine:** age badges are heuristic (24h/48h); real SLAs per priority with breach alerts would be next.
