# AuthorDesk: best-practices review

This was a review and optimisation pass over the client features, shared components, hooks/lib and the backend (`src/server`). The visual theme was out of scope because another agent was working on it in parallel. The public `/api/v1` contract and DTO shapes have not changed. Apart from the improvements listed below, behaviour is the same.

**Verification:** `tsc --noEmit` is clean and `eslint src tests` is clean. `vitest run` passes 116 of 116 tests: the 109 existing tests plus 7 new ones.

## Findings

| Area | Finding | Severity | Fix applied (file) |
|---|---|---|---|
| Loading UX | No route-level `loading.tsx`. In-component loading used generic grey bars (`ListSkeleton`/`CardsSkeleton`) that didn't match the final layout, so the page shifted when data arrived. | High | Added 7 `loading.tsx` files (see below). Added layout-matching skeletons in `components/common/Skeletons.tsx` and per-feature `*-skeleton(s).tsx`. |
| Loading UX | Page headers were rebuilt inside each loading branch, and the copy was duplicated. | Med | Shared `*PageHeader` components (`BooksPageHeader.tsx`, `TicketsPageHeader.tsx`, `QueuePageHeader.tsx`, `DashboardPageHeader.tsx`) are used by both the page and its `loading.tsx`. |
| TanStack Query | Admin status, assign, category and priority changes waited for the round trip, and the select controls froze. | High | Optimistic `onMutate` updates both the detail and any cached queue rows. They roll back on error and are reconciled from the server response. Lists and stats get a targeted invalidation in `onSettled` (`admin-ticket/hooks/useAdminTicket.ts`). |
| TanStack Query | Filter or page changes only dimmed the table, with no indicator. The author list had no indicator at all. | Med | Both keep `keepPreviousData` and now show an `UpdatingIndicator` that reserves its space (`LoadingState.tsx`, `TicketQueue.tsx`, `TicketList.tsx`). |
| TanStack Query | Opening a ticket always showed a skeleton. | Med | Hovering or focusing a row prefetches the ticket's detail query (`usePrefetchAdminTicket`, `usePrefetchMyTicket`). |
| TanStack Query | `staleTime: 5 * 60_000` and `gcTime: 10 * 60_000` were literals in 4 hooks. The queue's AI poll used a magic `4000`, while the detail used `aiPendingRefetchMs` (3000). | Low | Added `queryStaleMs` and `queryGcMs` in `lib/queryClient.ts`, which also sets `gcTime` as a default. The queue now uses `aiPendingRefetchMs`. |
| TanStack Query | `useDocumentVisible` also listened to `focus`, which can't change its snapshot. | Low | Now listens to `visibilitychange` only (`hooks/useDocumentVisible.ts`). |
| Maps / lookups | `ActivityTimeline` used an 8-case `switch`. `ConversationThread` used nested ternaries for sender labels. | Med | Both use exhaustive lookup tables typed with `satisfies Record<TicketEventType, …>` / `Record<Role, Record<Role, …>>` (`ActivityTimeline.tsx`, `ConversationThread.tsx`). |
| Maps / lookups | The books page called `getRoyaltyNotes` twice per book on every render, once for the table and once for the hidden mobile cards. | Med | Notes are now built once into a `Map<bookId, notes>` with `useMemo` and passed to both views (`BooksOverview.tsx`, `BooksList.tsx`). |
| Maps / lookups | The author ticket list ran 3 `filter` passes per render for tab counts and the visible list. | Low | A single-pass `groupByTab` creates a `Record<tab, tickets[]>` with `useMemo` (`TicketList.tsx`). |
| Maps / lookups | Copy-pasted JSX blocks: 5 summary cards, 8 mobile-card fields, 2 dashboard quick links, 4 tips, and table headers repeated between the table and its skeleton. | Low | Config arrays rendered with `.map()`. Column lists are shared with the skeletons (`books/components/layout.ts`, `admin-queue/components/queueLayout.ts`). |
| Code splitting | Everything shipped in the first route chunk, including dialogs that are only shown on interaction. | Med | Added `next/dynamic` for `ConfirmDialog` (`LazyConfirmDialog`: not loaded until first opened), `InternalNotes`, `ActivityTimeline`, `FilePicker` and the dashboard widgets, each with a skeleton fallback. |
| Backend | The admin detail made 2 separate full-document user reads (author and assignee). | Med | One projected `$in` query (`findUsersWithProfileByIds`) inside the existing `Promise.all` (`adminTicket.service.ts`, `user.repository.ts`). |
| Backend | Reassignment ran its two lookups one after the other. `findAdminById` had no projection. | Low | `Promise.all`, plus `{ name: 1 }` projection. |
| Backend | The urgency sort always added a computed `_resolved` field. This forced an in-memory sort even for the default "Open + In Progress" view, where the field is constant. | Med | `_resolved` is only added when the status filter mixes live and done tickets. Otherwise the `{status, priorityRank, createdAt}` index can drive the sort (`ticket.repository.ts`). A test covers both paths. |
| Backend | `retryClassification` loaded the full ticket twice. | Low | Uses a cheap `ticketExists` check first. A test covers 404 without calling the AI. |
| Backend | The "ticket closed" 409 message was duplicated in two services. `type Id` was redeclared in 5 repositories. The ratio precision was a magic `10_000`. | Low | Added `Errors.ticketClosed()` (`http/errors.ts`), shared `Id` in `repositories/types.ts`, and `ratioScale` (`stats.service.ts`). |
| React | `SearchBox` suppressed `exhaustive-deps` to read the latest `initial`/`onSearch`. | Low | Uses `useEffectEvent`, so there is no suppression (`QueueFilters.tsx`). |
| React | The author ticket page wasn't keyed by `ticketId`, so a half-typed reply carried over to the next ticket. | Low | `key={ticketId}` (`author/tickets/[ticketId]/page.tsx`). |
| React | `bookOptions(books)` was rebuilt on every render inside the RHF `Controller`. | Low | `useMemo` (`NewTicketForm.tsx`). |
| Errors | Uncaught render errors had no segment boundary. The queue stats strip silently rendered nothing when its query failed. | Med | Added `error.tsx` for the author and admin segments (using Next 16 `retry`) through `RouteError`. The stats strip shows an inline Retry. |
| Duplication | The not-found check `[400, 404, 422].includes(status)` was copied in 2 features. "General / Account" and "General / Account Level" were mixed. Plural logic was repeated 3 times. | Low | Added `isNotFoundError` (`lib/apiClient.ts`) and `bookLabel`, `generalBookLabel`, `plural` (`lib/format.ts`). |
| Magic numbers | The description minimum `20` was hard-coded 3 times in the form. The "Max 10 MB" text was hard-coded. Confidence and AI-health thresholds were inline. | Low | `descriptionMin` is read from `createTicketSchema`, the size comes from `formatBytes(maxAttachmentBytes)`, and named threshold constants were added. `formatBytes` now drops a trailing `.0`. |
| Dark mode | Palette colours had no `dark:` variants in 11 of my files: amber notes panel and alerts, violet AI accents, warn/danger/attention text. | Med | All moved to semantic maps in `components/common/tones.ts` (`toneText`, `toneCallout`, `noteClasses`, `confidenceBar`, `aiRing`), each with a dark variant. None remain in my files. |
| A11y | Skeletons had no accessible name. | Low | `LoadingRegion` adds `aria-busy` and a screen-reader label. The queue table sets `aria-busy` while updating. |

## Not changed (and why)

- **Author list returns full `messages[]` per ticket.** The list only needs the last message. Trimming it would change `AuthorTicketDTO` (contract), so this is a candidate for a v2 `lastMessage` field.
- **Draft cache vs new author replies.** The draft query has `staleTime: Infinity`, and live updates don't invalidate it, so an admin with the page open keeps an outdated draft until they regenerate. Adding draft invalidation would change behaviour (it would trigger LLM calls), so it is left as a recommendation.
- **Two pollers while AI is pending.** The queue/detail `refetchInterval` (3 s, visibility-aware) and the 5 s live poll both run. They are intentional: the first covers missed deltas, and both pause when the tab is hidden.
- **Queue search is an unanchored case-insensitive regex.** It can't use an index. That's fine at this data size; a text index or Atlas Search would be the upgrade.
- **No new indexes.** The existing ones cover the queue, author lists, polling and stats. The sort change above makes better use of the existing queue index.
- **`useSearchParams` and Suspense.** The queue and new-ticket pages already had boundaries. Their fallbacks now use the same layout skeletons as `loading.tsx`.
- **Per-ticket `<title>`.** Data is fetched on the client (cacheComponents is off), so pages keep their static titles: "Ticket", etc.
- **Theme-agent files (reported, not edited):**
  - `src/app/docs/page.tsx` uses `bg-white`. The lead is fixing it.
  - The `/docs` inline script appends the Swagger stylesheet to `<head>` and never removes it. After a client-side navigation away from `/docs` it stays loaded, though its rules are mostly scoped under `.swagger-ui`. A cleanup on unmount, or linking to `/docs` with a plain `<a>`, would isolate it fully. The Swagger JS itself is only requested on `/docs`.
  - `components/layout/LiveIndicator.tsx` uses `bg-emerald-400` (ping) with no dark variant. That is acceptable for a status dot.

## Dark-mode readiness

All semantic colours in feature code now come from `components/common/tones.ts`, and every entry carries a `dark:` pair. Surfaces use tokens (`bg-background`, `bg-card`, `bg-muted`, `text-muted-foreground`, `border`). To move these colours onto theme CSS variables later, only that one file needs to change.

## Bundle/loading improvements

**Route `loading.tsx`.** Each renders the real page header plus a body skeleton:

- `/author/books`: summary cards (5, with the last one spanning on mobile), a table on `lg`, cards below `lg`.
- `/author/tickets`: tabs strip and ticket rows.
- `/author/tickets/[ticketId]`: back link, header, query card, thread, reply box.
- `/author/tickets/new`: form fields, with the real (static) tips sidebar.
- `/admin/tickets`: stats chips, filter panel, and a table with the real column headers.
- `/admin/tickets/[ticketId]`: the two-column layout (header and controls, query, thread, draft panel | classification, notes, author, book, activity).
- `/admin/dashboard`: metrics, bar panels and AI-health grid.

**In-component skeletons.**

- They appear only while `isPending` (first load). Refetches keep the previous data and show "Updating…".
- The AI draft panel ("Drafting a reply from the knowledge base…") shows a textarea-sized skeleton.

**Reusable blocks** (`components/common/Skeletons.tsx`): `LoadingRegion`, `TextSkeleton`, `TableSkeleton`, `CardGridSkeleton`, `PanelSkeleton`, `ThreadSkeleton`, `TicketHeaderSkeleton`, `QueryCardSkeleton`, `DetailSkeleton`.

**Lazy-loaded with `next/dynamic`:**

| Component | Fallback | Why |
|---|---|---|
| `ConfirmDialog`, via `LazyConfirmDialog` (close-ticket, replace-draft) | none (not mounted until opened) | Only shown on interaction |
| `InternalNotes` | `NotesSkeleton` | Below the fold; brings react-hook-form and its resolver |
| `ActivityTimeline` | `TimelineSkeleton` | Bottom of the sidebar |
| `FilePicker` | button-sized skeleton | Optional field |
| `DashboardContent` (widgets) | `DashboardSkeleton` | The chunk downloads in parallel with the stats request |

These stay eager on purpose because they are above the fold and critical: the queue table and filters, the ticket header, the conversation thread and the draft panel.
