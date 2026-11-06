# Write-up: approach, trade-offs, path to production

**What I prioritised.** The brief says the hard problem is *author communication at scale*, so I built around the ticket lifecycle and made the AI a dependable assistant rather than a single point of failure.

**Order of work:**
1. A clean contract layer first:
   - shared Zod schemas and response DTO types
   - a single `withApi` wrapper for auth, roles, validation and errors
2. Then the core ticket flow for both portals.
3. Then the AI layer, built on three principles:
   - **Never block the author.** Tickets are saved first and classified after the response.
   - **Never let the model guess facts.** Payout dates, the ₹1,000 threshold, never-paid status and production stage are computed in code and handed to the model as a facts block.
   - **Pay only for what's needed.** Only the KB section for the ticket's category is sent, drafts are cached per ticket, the smallest model does classification, and every call's tokens are logged.

**Trade-offs I made deliberately:**
- **Next.js full-stack instead of a separate API server.** One deployable, same-origin cookie auth and shared types, which mattered on a tight timeline. The API is still a versioned REST surface with OpenAPI docs, so it can be split out later.
- **Polling instead of WebSockets/SSE.** Vercel's serverless model has no long-lived process or shared memory. A 5s, visibility-aware poll of a tiny indexed delta endpoint is robust and cheap, and it feels real-time for this use case.
- **MongoDB with intentional embedding:**
  - Message threads are embedded in the ticket (bounded, read together).
  - Internal notes are kept in a separate collection, so they *cannot* leak to authors even if a projection is wrong.
- **A free-tier LLM (Gemini) behind a provider interface.** Reviewers can run it at no cost, and swapping in Claude or GPT is one file. An optional second provider (Groq) slots into the same fallback chain when its key is set; the live demo runs without it. Below the LLMs sits a deterministic rule classifier, so the queue is always sorted and labelled even with zero AI.
- **Admin overrides always win.** The AI never overwrites a human decision. Each original AI suggestion is stored, which gives an override rate: a free, continuous measure of classification accuracy.
- **Out of scope for now:** real file upload, email notifications, password reset and a formal SLA engine. These are listed in the README with the next step for each.

**How I'd evolve this into a production system:**
1. **Reliability:**
   - Move AI work from `after()` to a durable queue (e.g. QStash/SQS) with retries and dead-lettering.
   - Share circuit-breaker and rate-limit state in Redis.
   - Add tracing and alerting on the AI fallback rate.
2. **AI quality:**
   - Build a labelled evaluation set from resolved tickets.
   - Track draft acceptance (sent unedited vs edited vs discarded) per `promptVersion`.
   - Feed admin overrides back as few-shot examples.
   - Move to embeddings-based retrieval once the KB outgrows category sections.
   - Add a "confidence below threshold → flag for human triage" rule.
3. **Real-time and comms:**
   - Use SSE or WebSockets backed by MongoDB change streams on a persistent runtime.
   - Send email/WhatsApp notifications to authors on replies.
4. **Ops features:**
   - SLA timers per priority with breach alerts.
   - Macros and saved replies.
   - Bulk actions.
   - Per-agent workload view.
   - Linking tickets to royalty statements so drafts can quote exact line items.
5. **Security and compliance:**
   - Managed auth (SSO for staff; magic links for authors).
   - An audit export.
   - PII redaction before prompts.
   - A data-retention policy for AI logs.
