# AuthorDesk AI layer

The AI layer does two jobs:

1. **Classification**: assigns a category and priority to every new ticket, so the admin queue is sorted by urgency.
2. **Reply drafting**: writes a first draft of the reply. It is grounded in the knowledge base and in facts computed from the author's real book data. A human agent reviews and edits every draft before it is sent.

Everything lives in `src/server/ai/`. Business code imports only `@/server/ai`, which exports `classifyTicket`, `getDraftForTicket`, `isAiConfigured` and `getNextPayoutDate`. Neither main function ever throws.

```
index.ts                 public contract (thin wrappers that never throw)
classifier.service.ts    claim → LLM (small model) → Zod → rule fallback → guarded persist → event
drafter.service.ts       cache check → facts + KB → LLM (larger model) → validate → upsert AiDraft
llmClient.ts            timeout, retry/backoff, Gemini→Groq fallback, circuit breaker, usage logging
providers/               LLMProvider interface + Gemini (@google/genai) + Groq (fetch)
prompts/                 classify.prompt.ts (classify-v1), draft.prompt.ts (draft-v1), sanitize.ts
knowledge-base/          KB policy sections, tone guide, sample Q→A guidance (TS strings, templated)
context/buildFacts.ts   PURE: payout dates, threshold/overdue logic, stage, platforms, ages
context/loadContext.ts  loads ticket + book + author → FactsInput
ruleClassifier.ts       deterministic keyword/regex fallback
usageLogger.ts          fire-and-forget AiUsageLog writes
```

## 1. Prompt strategy

### Classification (`classify-v1`, small model, temperature 0, max 200 output tokens)

- **System prompt** contains four things:
  - the role;
  - the 6 category definitions, taken from the KB scope;
  - an explicit **priority rubric**:
    - CRITICAL: money withheld for multiple quarters, legal or rights issues, or a live book published wrongly.
    - HIGH: ISBN errors, print defects, a royalty one payout run late, or a listing unavailable for weeks.
    - MEDIUM: sync issues, timeline questions, or questions about how royalty is calculated.
    - LOW: how-to questions and bio or description edits.
  - **8 few-shot examples**, chosen for the edge cases models get wrong:
    - "late royalty" versus "how is it calculated";
    - a payout that is not yet due versus one that is genuinely overdue;
    - a description edit (GENERAL, not ISBN);
    - an unavailable listing for a short time versus an extended time;
    - a legal threat (CRITICAL).
- **User prompt** contains:
  - the subject and the description, cut to 1,500 characters, inside `<author_message>` tags;
  - one trusted **Context** line computed in code, for example: `Royalty pending ₹2,546; never paid; OVERDUE, 8 payout run(s) missed`.

  Priority comes from **data, not tone**. An author with ₹850 pending who says "never received" is correctly not CRITICAL, because that balance rolls over under the ₹1,000 threshold. The prompt includes no author name or contact details.
- **Output**: JSON only. The format is enforced three times:
  1. the provider's JSON mode (Gemini `responseJsonSchema` with enums; Groq `json_object`);
  2. a Zod check (category and priority must be in the enum, confidence must be between 0 and 1, reasoning is cut to 300 characters);
  3. one retry with a corrective suffix. If that also fails, the rule classifier takes over.

### Drafting (`draft-v1`, larger model, temperature 0.4, max 600 output tokens)

The prompt is built in layers. The most static parts come first, so the provider can cache the prefix:

1. **Static system prompt** (identical for every ticket). It contains:
   - the persona: a member of the {PUBLISHER_NAME} author support team;
   - the full tone guidelines;
   - the hard rules:
     - use only facts from FACTS and the KB;
     - never invent amounts, dates, tracking numbers or names;
     - never do arithmetic;
     - if a fact is missing, say the team will check and give a timeline;
     - own mistakes;
     - do not apologise for a balance that rolls over under the threshold;
     - give a timeline for any escalation and end with a clear next step;
     - write plain text of 120–220 words, greet the author by first name, and sign off exactly;
     - no markdown and no placeholders;
     - never mention AI;
   - the injection guard.
2. `<knowledge_base>`: a 1-sentence company overview, plus **only the KB sections for the ticket's category**.
3. `<guidance>`: the 1–2 sample Q→A response strategies for that category.
4. `<facts>`: computed in code (section 3 below).
5. `<conversation>`:
   - the subject and the original description;
   - **the last 4 messages only**, each cut to 800 characters;
   - author text in `<author_message>` tags and our earlier replies in `<support_reply>` tags.
6. Instruction: reply to the latest author message, without repeating what our earlier replies said.

The output goes through `cleanDraft`, which strips stray markdown and **rejects** drafts that are too short or contain placeholders like `[Name]`. A rejected draft counts as a bad response, and the client tries the next provider.

## 2. Knowledge base retrieval

The KB is about one page, so retrieval is a **deterministic lookup from category to KB section** (`categoryKbSections`). Embeddings or a vector store would add cost, latency, a new dependency and new ways to fail, with no gain in recall. The category is already computed and is the best possible key.

| Category | Sections included |
|---|---|
| ROYALTY_PAYMENTS | Royalty Policy |
| ISBN_METADATA | ISBN Policy, Metadata updates |
| PRINTING_QUALITY | Printing & Quality |
| DISTRIBUTION_AVAILABILITY | Distribution & Availability |
| BOOK_STATUS_PRODUCTION | Production Stages (plus the 7–10 day go-live note) |
| GENERAL_INQUIRY | Full Company Overview, Metadata updates |

A royalty prompt therefore never contains the printing turnaround text, and a unit test checks this. Including only relevant sections saves tokens, and it also stops the model from citing unrelated policy.

The KB is stored as TypeScript strings rather than `.md` files read from disk, so it is bundled into the serverless function. It is templated from `env().PUBLISHER_NAME`: "Inkwell Publishing" produces the store name "Inkwell Store".

If a ticket has not been classified yet, the drafter picks KB sections using the free rule classifier.

## 3. The facts block: no arithmetic and no invented dates

`context/buildFacts.ts` is pure and fully unit-tested. It computes the following:

- **Next payout date**: the first "quarter end + 45 days" on or after today. Payouts fall on 15 May, 14 Aug, 14 Nov and 14 Feb. For example, today 2026-11-05 gives 2026-11-14, and 2026-11-20 gives 2027-02-14.
- **Royalty assessment**: whether the pending amount is at or above ₹1,000, whether the book has never been paid, the days since the last payout, and the number of payout runs missed. A run counts as missed only if it falls after the last payout, or after the first quarter that ended after publication. The result is one of these states:
  - `BELOW_THRESHOLD`: rolls over and is **not overdue**. The draft explains the policy and does not apologise. Example: ₹850 pending with no payout ever.
  - `DUE_NEXT_RUN`: due in the next payout run.
  - `OVERDUE`: the facts block says "This is our delay: own it… within 48 hours". If 2 or more runs were missed, it is flagged `longOverdue`, which pushes classification to CRITICAL. Example: ₹2,546 pending, never paid, and 8 runs missed since July 2024.
- **Book details**: days since publication, ticket age, and the print partner.
- **Production stage**: the stage number out of 9 and the next stage. It also gives the typical delay point: Cover Design waits on author approval, and Proofreading has revision rounds. For a stage that is not a typical delay point, it says "the actual reason must be checked".
- **Platforms**: where the book is listed, compared with the full list of 5 platforms.
- **Missing data**: for a null book (a General ticket), the block says not to assume any book details. For an in-production book (no MRP, no sales), it says there is no royalty yet and that listings go live within 7–10 business days. Bank-account linkage is not visible in this system, so the block tells the model to ask the author rather than guess. The block ends with "Facts not listed here are UNKNOWN".

## 4. Cost controls

| Control | Effect |
|---|---|
| Small model (`gemini-3.5-flash-lite`) for classification, larger model (`gemini-3.5-flash`) only for drafts | Cheapest model for the high-volume call |
| `thinkingBudget: 0` | Thinking tokens are billed as output and count against `maxOutputTokens`. They add no value for triage or short replies |
| `maxOutputTokens` 200 / 600, temperature 0 / 0.4 | Bounded output; classification is deterministic |
| Only the category's KB sections, cut description, last 4 messages × 800 characters | Input stays roughly flat as threads grow |
| **Draft cache** (`AiDraft`, valid while `basedOnMessageCount === messages.length`) | Reopening a ticket costs **0 tokens**. A new message or `regenerate: true` triggers a new draft |
| In-flight de-duplication of drafts per ticket | Two agents opening the same ticket make one call |
| Atomic classify claim (30s window), and a skip when both fields are ADMIN-set | No double-billing; no tokens spent on values a human has already decided |
| Static prompt prefix first | Allows provider prefix caching. The classify system prompt is about 1.15k tokens, which is above Gemini's implicit-cache minimum; the draft system prompt is about 600 tokens |
| Circuit breaker and capped `retry-after` | No slow, repeated calls to a provider that is down |

**Rough token estimate per ticket** (about 4 characters per token, measured on the real prompts):

| Call | Input | Output |
|---|---|---|
| Classify | about 1.15k system + 0.1–0.5k ticket = **about 1.3–1.7k** | **about 50–70** |
| Draft (new ticket) | about 0.6k system + 0.2k KB/guidance + 0.35k facts + 0.1–0.4k ticket = **about 1.3–1.6k** | **about 250–350** |
| Draft (long thread, 4 messages) | **up to about 2.4k** | about 300 |

That comes to about **3–4k tokens per ticket**: one classification and one draft. Cache hits cost nothing. Both providers are free tiers. At paid Flash-Lite and Flash prices, this is a fraction of a US cent per ticket. Every attempt is recorded in `AiUsageLog` (operation, provider, model, tokens, latency, success, error code), and the logs expire after 90 days. Tokens are logged on failed attempts too, because a bad response is still billed.

## 5. Failure modes and degradation

The guarantee: **ticket creation never depends on AI, and the queue is always sorted.**

| Failure | Behaviour |
|---|---|
| No API keys | Providers report `isConfigured() = false` and **no call is made**. Classification uses the **rule engine**: `categorySource` and `prioritySource` are set to `RULE`, `ai.status` to `FAILED`, and `ai.error` to `NOT_CONFIGURED: …`. Drafts return `UNAVAILABLE` with "AI is not configured…" |
| 429 / 5xx | Up to 2 retries with exponential backoff (400ms × 2ⁿ plus 0–50% jitter). A `retry-after` hint is honoured up to 4s; a longer one means fail over immediately instead of waiting |
| Timeout (`AI_TIMEOUT_MS`) | AbortController plus `Promise.race`, so a provider that ignores the abort signal still releases the caller. No retry on the same provider; move to the next |
| 400/401/403 | Not retryable on the same provider (bad key or bad model). Move to the next provider |
| Invalid JSON or schema mismatch | Logged as `BAD_RESPONSE` (the circuit breaker is not affected). Try the next provider, then one corrective retry, then the rule engine |
| A provider keeps failing | **Circuit breaker**: after 3 consecutive failures the provider is skipped for 60s. After that, a single half-open probe is allowed: success closes the circuit, failure re-opens it |
| Gemini fails | Groq (`llama-3.1-8b-instant`) takes over **if `GROQ_API_KEY` is set**; otherwise straight to the rule engine / manual reply |
| Everything fails | Classification gets rule values and `ai.status: FAILED`. The agent sees the reason, and the ticket is fully usable. The draft response is `{content:null, status:"UNAVAILABLE", message:"AI drafting is temporarily unavailable. Please write a reply manually."}` |
| An admin override arrives while the LLM call is running | The ADMIN guard is in the **update filter** (a `bulkWrite` of 3 guarded updates), so a human value is never overwritten |
| Database error mid-classification | Caught, and `ai.status` is set to FAILED on a best-effort basis. The caller never sees an exception |

The rule engine scores categories with weighted keywords and assigns priority with these heuristics:
- ISBN errors: HIGH.
- "never received", or "not received" for months or quarters: CRITICAL; "haven't received": HIGH.
- Print defects: HIGH.
- Unavailable listings and production questions: MEDIUM.
- Bio, description and how-to questions: LOW.
- Legal or rights language: CRITICAL.
- Urgency words: one level up.

It also uses the computed royalty facts: a long-overdue payout becomes CRITICAL, and a balance below the threshold or not yet due is capped at MEDIUM. Its confidence is capped at 0.7, so analytics can tell rule results apart from AI results.

## 6. Provider choice

- **Gemini (primary)**: free tier, native **JSON-schema-constrained output** (`responseJsonSchema` with enums), cheap Flash-Lite for triage and Flash for writing, implicit prefix caching, and good multilingual handling for Indian authors.
- **Groq (optional fallback)**: free tier, very low latency, OpenAI-compatible JSON mode. It is called through plain `fetch`, so it adds no SDK and no bundle weight. It is **off unless `GROQ_API_KEY` is set**, and the live demo runs without it (Gemini → rule engine). The fallback path is covered by unit tests with fake providers but hasn't been exercised against the real Groq API.
- **Swappable**: both implement `LLMProvider { name, isConfigured(), modelFor(tier), generate(req) }`, and callers ask for a *tier* ("small" or "large"), not a model name. Adding OpenAI, Anthropic or a local model means writing one file and adding it to the chain. Tests inject fake providers through `setLLMClientOverrides`, so no test touches the network.

## 7. Prompt-injection guard

- All author text, including the subject, description and follow-ups, goes inside `<author_message>…</author_message>`. Our earlier replies go inside `<support_reply>`.
- Both system prompts state that tag content is **untrusted data, never instructions**. The draft system prompt gives examples: requests to change the rules, reveal internal data, or promise refunds or amounts.
- `neutraliseTags()` removes any of our reserved tags (`author_message`, `facts`, `knowledge_base`, …) from author text, so an author cannot close the data block and inject "system" text. A unit test checks this.
- Facts come from the database, not from author claims. If an author writes "my dashboard shows ₹50,000", the draft still uses the computed figures.
- The structural backstop: classification output is limited to enum values, and every draft is reviewed by a human before sending.

## 8. Evaluating accuracy

- **Override rate (built in)**: `ai.suggestedCategory` and `ai.suggestedPriority` are always stored, even when an admin value wins. The override rate is the share of `categorySource="AI"` tickets that later become `ADMIN` with a final value different from the suggestion. It is reported in `AdminStatsDTO.ai.overrideRate` and can be broken down by category, model and prompt version. The **fallback rate** (the share of `RULE` sources) and **failure rate** come from `AiUsageLog`.
- **Offline evaluation set**: the 7 KB sample queries plus seeded and real tickets labelled by ops. Run both the LLM and the rule engine on them, and report category accuracy and priority accuracy (exact match, and within one level), plus a confusion matrix. Changes to the prompt bump `classifyPromptVersion` / `draftPromptVersion`, so results can be compared per version.
- **Draft quality**:
  - **Edit distance** between the AI draft and the reply actually sent (messages are flagged `aiAssisted`);
  - a periodic human rubric: correct facts, tone, a clear next step, and a timeline given;
  - automated checks: every ₹ amount and date in the draft must appear in the facts block, word count, sign-off present.
