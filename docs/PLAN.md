# Plan: AuthorDesk — Author Support & Communication Portal (Next.js + MongoDB)

> **Original day-one plan, kept for reference.** Some file names and details changed during the build (for example, the PascalCase/camelCase naming convention and the refined queue filters). The README's *Architecture* section reflects the code as shipped.

## Context
This is a 4-day take-home assignment. The portal has two sides: authors raise support tickets, and the admin/ops team answers them with AI help (auto-classification, priority scoring, drafted replies grounded in the knowledge base). It is seeded with the provided dataset of 10 authors and 18 books. Grading weights: AI 25%, Architecture/Code 25%, API 15%, Functionality 15%, Product 10%, Docs 10%.

**User constraints**
- The product is called **AuthorDesk**, and the fictional publisher name comes from env `PUBLISHER_NAME` (default "Inkwell Publishing"). It is used throughout the UI, knowledge base, seed data and prompts.
- Everything runs on **free tiers**.
- The stack is **Next.js + MongoDB**.
- Project folder: `/Users/bohra/Codebase/authordesk` (Codebase is empty today, so `git init` goes inside it).

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** | One codebase for UI and the REST API (Route Handlers under `/api/v1`) |
| UI | React 19, **Tailwind CSS + shadcn/ui**, lucide-react icons | Clean, functional UI fast |
| Client data | **TanStack Query 5** | Caching; refetches when a real-time event arrives |
| Forms | React Hook Form + Zod | Same Zod schemas as the API |
| Database | **MongoDB Atlas M0 (free)** + **Mongoose 8** | Schemas, validation, indexes; ticket + messages fit the document model naturally |
| Validation | **Zod** | Request bodies, query params, env vars, and LLM JSON output |
| Auth | Custom **JWT (`jose`) in an httpOnly cookie** + bcryptjs; `middleware.ts` guards pages; `withApi()` wrapper guards API routes | Simple email/password, as the brief asks; easy to explain line by line |
| Real-time | **Smart polling**: TanStack Query polls a lightweight `GET /api/v1/updates?since=<ISO>` every 5s while the tab is visible (paused when hidden, refetch on focus). It returns only the IDs and `updatedAt` of changed tickets, then refetches only what changed | Vercel is serverless: no in-memory event bus, and long-lived SSE connections hit function time limits. Polling a tiny delta endpoint is reliable and cheap, and feels instant at 5s. Upgrade path: SSE backed by Mongo change streams on a persistent host |
| Background AI work | `after()` from `next/server` (runs via `waitUntil` on Vercel) | Ticket returns 201 at once; classification runs after the response inside the same invocation |
| AI primary | **Google Gemini free tier** (`@google/genai`): `gemini-3.5-flash-lite` classifies, `gemini-3.5-flash` drafts (model IDs in env) | Free, JSON-schema structured output |
| AI secondary | **Groq free tier** (Llama 3.x), optional | Used when Gemini is rate-limited |
| AI last resort | Local keyword rule classifier + manual reply | App works with zero AI |
| API docs | OpenAPI 3 generated from Zod (`@asteasolutions/zod-to-openapi`), served at `/api/v1/openapi.json` + Swagger UI at `/docs` | Docs can't drift from the code |
| Logging | pino | Structured logs |
| Tests | **Vitest** + **mongodb-memory-server** | Services and route handlers tested against a real in-memory Mongo |
| Quality | ESLint (next config), Prettier, Husky + lint-staged, GitHub Actions CI (lint, typecheck, test) | Gates on every push |
| Hosting | **Vercel (Hobby, free)** for the Next.js app + **MongoDB Atlas M0 (free)** for the DB. Env vars are set in the Vercel dashboard; Atlas network access allows `0.0.0.0/0`, since Vercel has no static IPs | Native Next.js hosting, no cold-start sleep, preview deploys per branch |

**Serverless-specific decisions:**
- **Mongoose connection** is cached on `globalThis`, so warm invocations reuse it and Atlas M0's 500-connection limit isn't exhausted. Pool size is small (`maxPoolSize: 5`).
- **Login rate limiting** is stored in Mongo (a `login_attempts` collection with a TTL index), not in memory, because in-memory state doesn't survive across instances.
- **Route config:** `export const runtime = 'nodejs'` on every API route, since Mongoose and bcrypt need Node. `middleware.ts` runs on Edge and only verifies the JWT with `jose`, with no DB access.
- **AI calls** have a 10s timeout, well under Vercel's function limit.

---

## 2. Folder hierarchy

```
authordesk/
├── src/
│   ├── app/                                  # ROUTING ONLY: pages + API route handlers (thin)
│   │   ├── layout.tsx                        # root layout, providers
│   │   ├── page.tsx                          # redirects by role
│   │   ├── (auth)/login/page.tsx
│   │   ├── (author)/author/
│   │   │   ├── layout.tsx                    # author shell / nav
│   │   │   ├── books/page.tsx
│   │   │   └── tickets/{page.tsx, new/page.tsx, [ticketId]/page.tsx}
│   │   ├── (admin)/admin/
│   │   │   ├── layout.tsx                    # admin shell / nav
│   │   │   ├── tickets/{page.tsx, [ticketId]/page.tsx}
│   │   │   └── dashboard/page.tsx            # stats
│   │   ├── docs/page.tsx                     # Swagger UI
│   │   └── api/v1/
│   │       ├── auth/{login,logout,me}/route.ts
│   │       ├── me/books/route.ts
│   │       ├── me/tickets/route.ts
│   │       ├── me/tickets/[ticketId]/{route.ts, messages/route.ts}
│   │       ├── admin/tickets/route.ts
│   │       ├── admin/tickets/[ticketId]/{route.ts, messages/route.ts, notes/route.ts,
│   │       │                             draft/route.ts, draft/regenerate/route.ts, ai/retry/route.ts}
│   │       ├── admin/stats/route.ts
│   │       ├── updates/route.ts              # polling delta: tickets changed since <ts>
│   │       └── openapi.json/route.ts
│   │
│   ├── server/                               # BACKEND ONLY (every file imports 'server-only')
│   │   ├── config/env.ts                     # Zod-validated env; the only place secrets are read
│   │   ├── db/
│   │   │   ├── connect.ts                    # cached Mongoose connection
│   │   │   └── models/                       # user, book, ticket, ticket-note, ai-draft,
│   │   │                                     # ticket-event, ai-usage-log, counter
│   │   ├── repositories/                     # data access only (queries, projections)
│   │   │   └── {user,book,ticket,note,draft}.repository.ts
│   │   ├── services/                         # business logic + ownership rules
│   │   │   └── {auth,book,ticket,admin-ticket,stats}.service.ts
│   │   ├── http/
│   │   │   ├── withApi.ts                   # wrapper: auth → role → zod validate → handler → error mapping
│   │   │   ├── errors.ts                     # AppError + error codes
│   │   │   └── responses.ts                  # ok(), created(), paginated()
│   │   ├── auth/{jwt.ts, password.ts, session.ts}
│   │   ├── ai/
│   │   │   ├── providers/{llmProvider.ts, gemini.provider.ts, groq.provider.ts}
│   │   │   ├── llmClient.ts                 # timeout, retry/backoff, fallback chain, circuit breaker
│   │   │   ├── knowledge-base/               # KB split by category (.md) + tone guide + examples
│   │   │   ├── prompts/{classify.prompt.ts, draft.prompt.ts}   # versioned
│   │   │   ├── context/buildFacts.ts        # deterministic facts (payout date, threshold, stage)
│   │   │   ├── classifier.service.ts         # AI → rule fallback
│   │   │   ├── ruleClassifier.ts
│   │   │   ├── drafter.service.ts
│   │   │   └── usageLogger.ts
│   │   └── lib/{logger.ts, rateLimit.ts}    # rate-limit backed by Mongo TTL collection
│   │
│   ├── shared/                               # ISOMORPHIC: safe for client + server
│   │   ├── constants/{ticket.ts, roles.ts}   # status, category, priority enums + labels
│   │   ├── schemas/{auth,ticket,admin}.schema.ts   # Zod DTOs
│   │   └── types/
│   │
│   │                                         ── FRONTEND ──
│   ├── components/                           # reusable UI, no business logic
│   │   ├── ui/                               # shadcn primitives: button, input, select, textarea,
│   │   │                                     #   dialog, table, card, badge, skeleton, toast, tabs
│   │   ├── common/                           # app-wide reusable pieces built on ui/
│   │   │   ├── StatusBadge.tsx  PriorityBadge.tsx  CategoryBadge.tsx  AgeBadge.tsx
│   │   │   ├── EmptyState.tsx  LoadingState.tsx  ErrorState.tsx
│   │   │   ├── PageHeader.tsx  Pagination.tsx  ConfirmDialog.tsx
│   │   │   └── Currency.tsx  RelativeTime.tsx
│   │   ├── forms/                            # FormField.tsx, FilePicker.tsx, SelectField.tsx
│   │   └── layout/                           # AppShell.tsx, sidebar.tsx, topbar.tsx, UserMenu.tsx,
│   │                                         #   AuthorNav.tsx, AdminNav.tsx
│   │
│   ├── features/                             # one folder per feature; each is self-contained
│   │   ├── auth/
│   │   │   ├── components/LoginForm.tsx
│   │   │   ├── hooks/{use-login.ts, useSession.ts}
│   │   │   └── api.ts                        # calls to /api/v1/auth/*
│   │   ├── books/
│   │   │   ├── components/{books-table.tsx, book-card.tsx, RoyaltySummary.tsx, production-status.tsx}
│   │   │   ├── hooks/useMyBooks.ts
│   │   │   ├── utils/royalty.ts              # totals, "below ₹1,000 threshold" helper
│   │   │   └── api.ts
│   │   ├── tickets/                          # author side
│   │   │   ├── components/{ticket-form.tsx, TicketList.tsx, ticket-card.tsx, ticket-thread.tsx}
│   │   │   ├── hooks/{use-my-tickets.ts, use-ticket.ts, use-create-ticket.ts}
│   │   │   └── api.ts
│   │   ├── admin-queue/
│   │   │   ├── components/{QueueTable.tsx, QueueFilters.tsx, queue-stats.tsx}
│   │   │   ├── hooks/{use-admin-tickets.ts, useQueueFilters.ts}   # filters ↔ URL params
│   │   │   └── api.ts
│   │   └── admin-ticket/
│   │       ├── components/{TicketDetail.tsx, ai-draft-editor.tsx, classification-override.tsx,
│   │       │               InternalNotes.tsx, author-context-card.tsx, status-select.tsx, assign-button.tsx}
│   │       ├── hooks/{useAdminTicket.ts, use-draft.ts, use-update-ticket.ts, use-add-note.ts}
│   │       └── api.ts
│   │
│   ├── constants/                            # FRONTEND-only constants
│   │   ├── routes.ts                         # routes.author.books, routes.admin.ticket(id) …
│   │   ├── queryKeys.ts                     # TanStack Query key factory
│   │   ├── ui.ts                             # pollIntervalMs, pageSize, badge colour maps
│   │   └── messages.ts                       # UI copy for empty/error states
│   ├── hooks/                                # global hooks used across features
│   │   ├── useLiveUpdates.ts               # visibility-aware polling → invalidate changed queries
│   │   ├── useDebounce.ts
│   │   └── useDocumentVisible.ts
│   ├── lib/                                  # framework-agnostic client helpers
│   │   ├── apiClient.ts                     # fetch wrapper: JSON, cookies, error → ApiError
│   │   ├── queryClient.ts
│   │   ├── format.ts                         # formatINR, formatDate, timeAgo
│   │   └── utils.ts                          # cn() class merge
│   ├── providers/                            # QueryProvider.tsx, toast-provider.tsx, AppProviders.tsx
│   ├── types/                                # frontend view-model types (API DTO types come from shared/)
│   ├── styles/globals.css
│   └── middleware.ts                         # page guards: /author/* AUTHOR, /admin/* ADMIN
│
├── scripts/seed.ts                           # loads data/, hashes passwords, demo tickets
├── data/sample-data.json                     # dataset with publisher renamed
├── tests/{unit,integration}/
├── docs/{PLAN.md, API.md, ARCHITECTURE.md}
├── .github/workflows/ci.yml
├── .env.example   README.md   WRITEUP.md   vercel.json (optional)
└── package.json   tsconfig.json   next.config.ts   vitest.config.ts   eslint/prettier configs
```

**Frontend rules:**
- `app/` pages are thin: they compose feature components and do no fetching logic themselves.
- `features/*` may import from `components/`, `hooks/`, `lib/`, `constants/` and `shared/`, but **never from another feature**. Anything two features need moves up into `components/common` or `hooks/`.
- `components/ui` holds generic primitives. `components/common` holds app-specific reusable pieces (badges, empty states).
- `constants/` vs `shared/constants`:
  - `constants/` is frontend-only (routes, query keys, UI settings).
  - `shared/constants` holds the domain enums (status, category, priority) that the backend uses too.
- Each feature has a single `api.ts`, so the URLs for that feature live in one file.
- Files use kebab-case names; components are exported in PascalCase.

**Backend layering rule:**

> route.ts → `withApi` (auth/RBAC/validation) → service → repository → model

Route handlers contain no logic. Client code never imports `src/server/*`; the `server-only` package enforces this.

---

## 3. MongoDB schema design

| Collection | Key fields | Notes |
|---|---|---|
| `users` | email (unique), passwordHash, role `AUTHOR\|ADMIN`, name, authorProfile? { code `AUTH001`, phone, city, joinedDate } | Author profile embedded (1:1) |
| `books` | code `BK001`, authorId (ref, indexed), title, isbn, genre, publicationDate?, status, mrp?, royaltyPerCopy?, copiesSold, royalty { earned, paid, pending, lastPayoutDate? }, printPartner?, availableOn[] | Separate collection, queried by author |
| `tickets` | ticketNumber `T-1001` (counter), authorId, bookId? (null = General), bookSnapshot { title, isbn }, subject, description, attachment? { name, size }, status, category, categorySource `AI\|RULE\|ADMIN`, priority, priorityRank (0–3, for sorting), prioritySource, ai { status `PENDING\|DONE\|FAILED`, confidence, reasoning, model }, assigneeId?, **messages[]** { senderId, senderRole, body, aiAssisted, createdAt }, firstResponseAt, resolvedAt, timestamps | Messages embedded: bounded, always read with the ticket |
| `ticket_notes` | ticketId, adminId, body, createdAt | **Separate collection**, so internal notes can never be returned on an author query |
| `ai_drafts` | ticketId (unique), content, model, promptVersion, tokens { in, out }, basedOnMessageCount | Cached draft; marked stale when a new author message arrives |
| `ticket_events` | ticketId, actorId, type (STATUS_CHANGED, CATEGORY_OVERRIDDEN, ...), from, to | Audit trail; overrides also give labelled data for measuring AI accuracy |
| `ai_usage_logs` | operation, provider, model, tokens, latencyMs, success, errorCode | TTL index (90 days); feeds stats |
| `counters` | _id, seq | Atomic ticket numbers |

**Indexes:**
- `tickets {status, priorityRank:-1, createdAt:1}` for the queue
- `tickets {authorId, createdAt:-1}`
- `tickets {assigneeId}`
- `tickets {category}`
- `books {authorId}`

---

## 4. REST API (`/api/v1`)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | /auth/login · /auth/logout | public / any | Session cookie |
| GET | /auth/me | any | Current user |
| GET | /me/books | AUTHOR | Own books + royalty totals |
| GET/POST | /me/tickets | AUTHOR | List own / create |
| GET | /me/tickets/:ticketId | AUTHOR | Own ticket (no notes, no drafts) |
| POST | /me/tickets/:ticketId/messages | AUTHOR | Follow-up |
| GET | /admin/tickets | ADMIN | Queue: `status, category, priority, assignee, from, to, q, sort, page, limit` |
| GET/PATCH | /admin/tickets/:ticketId | ADMIN | Detail (+ author, book, notes, events) / update status, category, priority, assignee |
| POST | /admin/tickets/:ticketId/messages | ADMIN | Send reply (`aiAssisted` flag) |
| POST | /admin/tickets/:ticketId/notes | ADMIN | Internal note |
| GET | /admin/tickets/:ticketId/draft | ADMIN | Cached or new AI draft |
| POST | /admin/tickets/:ticketId/draft/regenerate | ADMIN | Force a new draft |
| POST | /admin/tickets/:ticketId/ai/retry | ADMIN | Re-run classification |
| GET | /admin/stats | ADMIN | Counts by status/priority, AI fallback rate, tokens |
| GET | /updates?since=ISO | any | Changed ticket IDs since a timestamp (authors: own only), used by polling |

**Conventions:**
- Error body is always `{ error: { code, message, details? } }`.
- Status codes are 400/401/403/404/409/422/429/503.
- Another author's ticket returns **404**, so ticket IDs can't be probed.
- Every list endpoint is paginated.

---

## 5. AI integration design (25% of the grade)

1. **Ticket creation never waits on AI.** The ticket is saved with `ai.status=PENDING` and the API returns 201. `after()` then runs classification and updates the ticket, which bumps `updatedAt` so admin polling picks it up. If the invocation dies mid-way, the ticket stays `PENDING`. The admin queue shows it as "Classifying…", and the admin detail view re-triggers classification for tickets stuck in `PENDING` for more than 2 minutes, so nothing is ever lost.
2. **Classification is one small-model call.** It returns category + priority + confidence + reasoning as schema-enforced JSON, validated with Zod. The prompt carries:
   - definitions of the 6 categories
   - a priority rubric from the KB (ISBN errors → High; unpaid royalties for months → Critical/High; bio/description edits → Low)
   - 6 few-shot examples
   - the book context: e.g. "book status = In Production" helps the model decide

   Invalid output gets one retry, then the rule classifier runs (`categorySource=RULE`).
3. **The draft prompt is built in layers:**
   - **Static system prompt** (cache-friendly prefix):
     - persona "Support team at {PUBLISHER_NAME}"
     - tone rules from the KB
     - hard rules: never invent numbers or dates, only use the facts provided, give a timeline, end with a next step, sign off as the support team
   - **Only the KB section for the ticket's category** plus its 1–2 sample Q→A examples. Not the whole KB.
   - **Facts block computed in code**:
     - author name
     - the selected book's fields
     - next payout date (quarter end + 45 days)
     - pending royalty above or below the ₹1,000 threshold
     - production stage, and where delays usually happen

     The LLM never does arithmetic.
   - **The latest author message plus the last 4 thread messages**, truncated. Not the full history.
4. **Cost controls:**
   - KB retrieval by category
   - drafts generated lazily on first admin open, cached in `ai_drafts`, regenerated only on request or when stale
   - the cheapest model for classification
   - `maxOutputTokens` caps (classify 150, draft 500)
   - every call logged to `ai_usage_logs` and shown on the dashboard
5. **Resilience:**
   - 10s timeout
   - exponential backoff on 429/5xx (2 retries)
   - fallback chain Gemini → Groq → rule classifier
   - circuit breaker that skips AI for 60s after 3 failures
   - the UI shows "AI unavailable — write a manual reply" plus a Retry button
   - tickets are always created
6. **Security:**
   - API keys are read only in `server/config/env.ts`
   - nothing is prefixed `NEXT_PUBLIC_`
   - `.env*` is gitignored
   - the author's text is wrapped in delimiters and treated as untrusted data (prompt-injection guard)
7. **Model choice** (documented in the README): a free tier the reviewers can reproduce, native JSON-schema output, and enough quality for short support replies. The `LLMProvider` interface makes moving to paid Claude or OpenAI a one-file change.

---

## 6. Development practices
1. **Thin routes, fat services.** The layering is strict, and the `server-only` package keeps backend code out of the client.
2. **Zod is the single source of truth.** One set of schemas drives API validation, client forms, OpenAPI docs and TypeScript types.
3. **Centralised error handling** through `withApi()` and `AppError`. No raw 500s; unknown errors are logged and returned as `INTERNAL_ERROR` without stack traces.
4. **Security defaults:**
   - httpOnly + SameSite=Lax cookie
   - bcrypt password hashing
   - rate limit on login
   - RBAC enforced in both `middleware.ts` (pages) and `withApi` (APIs)
   - ownership checks in services
5. **Feature-based client code** under `src/features/*`, with shared UI kept in `components/`.
6. **Testing:**
   - unit tests for the rule classifier, the facts builder (payout date math) and the prompt builder
   - integration tests for RBAC, validation and the AI fallback, using a mocked provider and mongodb-memory-server
7. **Git:**
   - `main` + feature branches
   - **Conventional Commits** (`feat(tickets): …`)
   - small, frequent commits so the history shows progression
8. **CI gates:** lint, typecheck and test must pass.
9. **Config only through env.** `.env.example` documents every variable.
10. **Comments explain the "why"**, especially in prompts and fallback logic.

---

## 7. Feature priority

### P0: Must ship (core ticket flow + AI)
1. Seed: 10 authors, 18 books, 2 admins, about 8 demo tickets
2. Login + JWT session + RBAC (pages and API)
3. Author **My Books**: every required field, with graceful handling of in-production books, `null` MRP and zero royalties
4. Author **Submit ticket**: book dropdown + "General / Account Level", subject, description, attachment picker (UI only)
5. Author **My Tickets**: status, original query, admin replies
6. Admin **Queue**: sorted by priority, then oldest; filters for status, category, priority and date
7. **AI classification + priority** (async), with admin override
8. **AI draft** from the KB; editable; when sent it appears on the author's view
9. Admin **status update, internal notes, assign to me**
10. **Graceful degradation** when AI is down
11. Live deployment + README with credentials

### P1: Should ship
12. Near-real-time updates via visibility-aware 5s polling of the delta endpoint
13. OpenAPI + Swagger UI
14. Cost controls (KB per category, cached drafts, token caps, usage log)
15. Fallback chain + retry/backoff + circuit breaker
16. Tests + CI
17. WRITEUP.md (one page)

### P2: If time allows
18. Stats dashboard
19. Author follow-up messages
20. Audit trail view
21. Real attachment upload
22. Age/SLA badges, "Assigned to me" view, URL-synced filters

---

## 8. Schedule
| Day | Work |
|---|---|
| 1 | Scaffold Next.js + tooling, env config, Mongo connection + models, seed script, auth + middleware + `withApi`, My Books (P0 1–3) |
| 2 | Ticket services + APIs for both roles, author and admin UIs, notes/assign/status, live polling (P0 4–6, 9; P1 12) |
| 3 | AI layer: providers, llmClient, KB, prompts, classifier, drafter, fallbacks, usage logs, override UI (P0 7, 8, 10; P1 14, 15) |
| 4 | Tests + CI, OpenAPI/Swagger, Vercel + Atlas deploy, README + WRITEUP, P2 items (P0 11; P1 13, 16, 17) |

## 9. Verification

**Local run:**
1. Put the Atlas URI in `.env.local`.
2. Run `npm run seed && npm run dev`.

**Deploy:**
1. Push to GitHub and import the repo into Vercel.
2. Set `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY` and `PUBLISHER_NAME`.
3. Run `npm run seed` once against the Atlas URI.
4. Smoke-test the live URL with both roles.

**End-to-end flow** (author in one browser, admin in another):
1. The author creates a ticket.
2. It appears in the admin queue live.
3. Category and priority fill in within seconds.
4. The admin opens the ticket, edits the draft and sends it.
5. The author sees the reply without refreshing.

**AI-down check:** unset `GEMINI_API_KEY`.
- The ticket is still created.
- It is labelled `RULE`.
- The draft panel says "write manually".
- Sending a reply still works.

**`npm test` covers:**
- an author gets 404 on another author's ticket
- an author gets 403 on `/api/v1/admin/*`
- bad payloads return 422
- a mocked 429 exercises the fallback path

**Edge cases:**
- Kavita: in-production book, ₹850 pending, below the threshold
- Ananya: never paid
- a General ticket with no book

**Leak checks:**
- Only the generic publisher name is used anywhere in code, data or docs
- no API key in the `.next/static` client bundle
