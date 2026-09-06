# SEO Audit Dashboard — Product Spec

An AI-powered tool that crawls a small set of pages on a site, audits their SEO health, and explains the results in plain language.

## Problem

Most SEO audit tools return raw technical data — pass/fail lists, scores, and jargon — that's hard for non-experts to act on. This project was built as a capstone during a front-end AI engineering internship at FlyRank AI to address that gap: it discovers and audits a small set of pages from a submitted domain, then uses an AI layer to summarize the findings across pages and suggest concrete fixes in plain language, rather than just listing raw checks.

## Scope Clarification

This is a multi-page SEO audit dashboard: a user submits a domain, the app discovers a bounded set of pages on that domain (see Page Discovery in Technical Constraints), audits each one, and presents an aggregated dashboard alongside per-page detail. This is a deliberately bounded version of full-site crawling, not unlimited/arbitrary-depth crawling — that is treated as a distinct, larger feature and lives in the Full Plan below.

## Target User

Small-business owners and non-technical site owners who want to know — in plain language — what's hurting their site's SEO across its main pages and how to fix it. The tool is deliberately the opposite of the raw pass/fail dashboards most SEO tools produce: it explains issues in terms of what they mean and what to do next, aggregated across the site rather than one page at a time.

## Core Flow (MVP)

1. A user submits a domain (or a starting URL) on the Home screen. An optional "enter URLs manually" toggle on the same screen lets the user paste specific page URLs directly, bypassing automatic discovery entirely — this is the override referenced in Technical Constraints for when the shallow-URL heuristic misfires. Manual entry is capped at 10 URLs (same cap as automatic discovery) and every pasted URL must share the same registrable domain as the submitted domain (e.g. `www.example.com` and `example.com` are treated as the same site; `blog.example.com` too — only the eTLD+1 must match, not a strict scheme/host/port origin check). A URL on a different registrable domain is rejected with an inline validation message before submit.
2. If automatic discovery is used, the app discovers pages on that domain (see Page Discovery in Technical Constraints), prioritizing shallower URLs (fewer path segments — e.g. `/menu` over `/product/commune-blend-500g`) on the assumption that core marketing/informational pages sit closer to the root than individual product or blog-post pages. Up to 10 pages are selected this way.
3. Each discovered (or manually entered) page is queued and audited in sequence for common technical SEO issues (title tags, meta descriptions, heading structure, alt text, canonical tags) plus a page speed score per page. Separately, as a one-time site-level finding (not per page), the audit records whether `robots.txt` and `sitemap.xml` exist at their conventional locations — their absence is itself a scored SEO issue, distinct from using them internally for page discovery in step 2.
4. Once all pages finish auditing, the dashboard renders with the deterministic, rule-based results: aggregated overview (site-wide score, most common issues across pages) plus a per-page breakdown with charts. If the final audited set contains exactly one page — whether because automatic discovery fell through to the single-page fallback, or because the user manually entered only one URL — the dashboard displays a visible banner ("Audited 1 page only") so a legitimate one-page result isn't mistaken for a broken multi-page one. If **every** page in the run failed to audit (scrape or PSI error), the dashboard is replaced entirely by a distinct total-failure error state — not a rendering of empty charts — with a clear explanation and a retry action.
5. The AI chat panel begins generating its plain-language, site-wide summary at the same moment the dashboard renders (skipped if the run hit total failure), streaming in token-by-token alongside the already-visible charts and scores (not blocking on it). If the user stops the initial summary mid-stream, the partial summary persists in the chat and the input re-enables immediately — follow-up questions are still allowed at that point, since they run against the underlying audit data (not against the completeness of the initial summary). The user can ask follow-up questions, including comparison questions ("which page has the worst heading structure?"), which are answered via the `comparePages` tool described below rather than purely from prompt context.

## Screens & Routes (MVP)

Distinguishing routed screens from in-flow states, per the single-dynamic-route pattern (`/dashboard/audits/[id]`) used for the audit flow. **Note on persistence:** because the MVP has no backend persistence, these routes are only meaningful within the same client session that ran the audit — the in-progress or completed audit exists in client/server memory for that run only. A hard refresh, a bookmarked link opened later, or a shared link opened by someone else will not resolve to a live audit; each of those cases surfaces the "no results found for this audit" error state (see below) rather than 404ing outright.

**Routes:**
1. **Home / audit input** (`/`) — domain/URL input form with validation and submit, plus the manual-URL-entry toggle described in Core Flow step 1 (capped at 10, same registrable domain only).
2. **Audit flow** (`/dashboard/audits/[id]`) — one route, five conditional render states depending on audit status:
   - *Loading* — processing state while the crawl + audit pipeline runs (discover pages → scrape each → PSI per page), with a step indicator and a live progress list showing which pages are done/pending/failed. The AI summary is **not** part of this stage — see Dashboard/overview below.
   - *Dashboard / overview* — site-wide aggregated score and most common issues across all audited pages, Recharts visualization comparing pages (e.g. score per page), rendered as soon as all page audits finish. Shows the single-page banner when the final set is exactly one page (Core Flow step 4). The AI summary chat streams in alongside this view, not before it.
   - *Total-failure* — distinct state shown instead of the Dashboard/overview when every page in the run failed to audit; no charts, no AI summary trigger, just a clear explanation and a retry action.
   - *AI summary chat* — not a separate route; the streaming chat panel described above, rendered within the Dashboard/overview state once page audits are complete.
   - *Error* — invalid domain, unreachable site, no sitemap found, PSI quota/rate-limit, Gemini quota/rate-limit, partial-failure (some pages audited, some failed), AI failure, or session-expired/audit-not-found (see persistence note above); each with a clear retry or next-step message.
3. **Page detail** (`/dashboard/audits/[id]/pages/[pageId]`) — pass/fail breakdown and Recharts visualizations for a single audited page, reached by drilling into a page from the overview. Same session-only scope as above.

## Data Sources (MVP)

- User-submitted domain/URL, or manually entered page URLs (input; capped at 10, same registrable domain only — see Core Flow step 1).
- `sitemap.xml` and `robots.txt` fetched from the target origin — used both to discover up to 10 candidate pages when automatic discovery is used, and as a one-time site-level presence check (see Core Flow step 3).
- Each discovered page's HTML via Cheerio — title, meta description, heading structure, alt text, canonical tag.
- Google PageSpeed Insights API — page speed score, queried per discovered page.
- Gemini API (free tier) — consumes the aggregated, multi-page findings to produce the AI summary and answer follow-up questions (AI layer, not a raw SEO data source).

## Where the AI Lives (MVP)

**Stack decision:** Uses the Gemini API (free tier) for the AI summary/chat layer, chosen for its no-cost tier during development — a practical constraint given PSI quota and Vercel Hobby limits already bound this MVP's budget elsewhere. The Vercel AI SDK's `streamText` supports Gemini as a provider, so the streaming/tool-calling patterns from the track brief transfer directly.

- A streaming Gemini model call via the Vercel AI SDK (`streamText`), in the chat API route, triggered once all page audits in a run have completed (see Core Flow step 5 for exactly when this fires relative to the rest of the UI, and Core Flow step 4 for the total-failure case where it does not fire at all).
- **Data access, given Vercel's stateless functions:** the audit endpoint and the chat endpoint are separate serverless invocations with no shared memory or store in the MVP. The structured, multi-page audit findings (site-wide aggregates + per-page breakdowns) are therefore held **client-side** once the audit completes, and are sent with the request body on every call to the chat endpoint — both to seed the initial system prompt and as the data the `comparePages` tool's `execute` function reads from on each call. There is no server-side re-fetch of "the current audit's data"; the client is the source of truth for the duration of the session, consistent with the no-persistence constraint below.
- Input: the full conversation history (UI messages converted server-side) plus the audit findings payload described above, seeded into a system prompt.
- Output: a token-by-token UI message stream rendered in the client chat (supports stopping mid-stream; see Core Flow step 5 for post-stop follow-up behavior).
- The overall score (both per-page and site-wide aggregate) is computed deterministically in code (rule-based), not by the AI, so results stay reproducible and auditable — and so the dashboard can render before the AI summary finishes.

### Tool Calling (FE-07)

- **`comparePages`** — a server-side tool, defined with a Zod schema, that the model calls when the user asks a page-comparison question (e.g. "which page has the worst heading structure?"). Input: `{ metric: "score" | "pageSpeed" | "titleTag" | "metaDescription" | "headingStructure" | "altText" | "canonicalTag" }`.
  - For **numeric metrics** (`score`, `pageSpeed`), `execute` ranks pages directly by that value from the audit findings payload (see Data access above).
  - For **checklist metrics** (`titleTag`, `metaDescription`, `headingStructure`, `altText`, `canonicalTag`), each page's audit already produces a per-check pass/fail result as part of scoring — `execute` ranks pages by **issue count within that category** (e.g. for `headingStructure`, the number of failed sub-checks such as missing H1, skipped heading levels, multiple H1s). "Worst" means most issues in that category; ties are broken by that page's overall score, lowest first.
  - `execute` reads only from the audit findings already included in the request (no re-scraping, no external calls) and returns the ranked list.
- All four tool-part states are rendered distinctly per FE-07's requirement: *input-streaming* (a subtle "checking pages…" indicator as the model decides on arguments), *input-available* (a small chip showing which metric was requested), *output-available* (the result rendered as a real component — a small ranked table, not a JSON dump or raw text), *output-error* (a designed retry state if the tool throws, e.g. if the expected audit data is missing from the payload).
- Keeping this as one tool for the MVP keeps the schema small and honest, per the "every field is a field the model can hallucinate" principle — additional tools (e.g. a "generate fix suggestion" tool) are a Full Plan candidate, not required for FE-07's minimum bar of one tool end to end.

## MVP — Out of Scope

Explicitly deferred for the capstone MVP:

- User accounts / authentication
- Audit history, persistence, and score trends (needs Supabase or similar)
- Unlimited/arbitrary-depth full-site crawling and batch audits across multiple domains
- Caching (Vercel serverless is stateless; would need a managed store such as Vercel KV)
- Application-level rate limiting beyond a basic in-app cap (see Technical Constraints) — deeper per-user quota logic is deferred
- Retrying only the failed pages from a partial run (MVP re-runs the whole audit)
- Additional AI tools beyond `comparePages` (e.g. automated fix-suggestion generation as a distinct tool call)
- Server-side persistence of audit findings between the audit run and the chat session (client carries the data for the MVP — see Where the AI Lives)

## MVP — Technical Constraints

- **Page discovery (fallback chain):** the app tries, in order — (1) `sitemap.xml` at the conventional path on the target origin; (2) if not found, `robots.txt` is checked for a `Sitemap:` directive pointing to a non-standard sitemap location; (3) if neither yields a usable sitemap, falls back to a single-page audit of the submitted URL only (surfaced via the single-page banner described in Core Flow step 4). The manual-URL-entry toggle on the Home screen (Core Flow step 1) is available as a user override at any point, independent of this chain, and is itself capped at 10 same-registrable-domain URLs.
- **Page cap: max 10 pages per audit run**, chosen to keep the pipeline inside serverless function time limits (Vercel Hobby plan) and to respect PageSpeed Insights quota. Pages are selected from the discovered sitemap by prioritizing shallower URLs (fewer path segments), a heuristic aimed at surfacing core marketing/informational pages over deep e-commerce product or blog-post pages — see the Commune Café reference case under Target User. The submitted URL itself is audited first within the selected set, so a budget trim can never land on the page the user asked about. This is a best-effort heuristic, not a guaranteed content classifier: it can still misfire on unusual site structures, which is why manual URL entry remains available as an override. If more than 10 pages remain after this prioritization, the UI states that the run was capped.
- Deployed on Vercel serverless functions; the runtime is stateless and ephemeral, so there is no in-app caching or in-memory state across requests. Anything shared requires a managed store (e.g. Vercel KV), which is deferred — this is also why audit findings are carried client-side into the chat session rather than re-fetched server-side (see Where the AI Lives).
- Because each page requires a Cheerio scrape + a PSI call, the pipeline runs pages in batches of 3 concurrent pages at a time (not fully parallel), to avoid hitting PSI rate limits or the serverless function's time budget; this number is a starting point to tune against real Hobby-plan timing once measured, not a final figure. The audit route runs on Vercel Fluid compute (300s Hobby ceiling, route budget ~290s with an absolute stop at ~294s) so a full 10-page run with PageSpeed per page fits; if the budget ever runs out, remaining pages report checks-only (technical checks with speed N/A + reason) instead of being dropped, and every page carries its per-page result with the actual cause when it fails. The loading screen's step indicator reflects this sequential/batched progress.
- No persistence in the MVP; audits (and their page-by-page results) are ephemeral and lost on refresh — see the persistence note under Screens & Routes for exactly what this means for each route.
- A basic in-app request cap on the audit endpoint (e.g. a short cooldown between runs) protects against trivial abuse, in addition to any platform-level protection; deeper quota/account-based rate limiting is deferred to the Full Plan.
- PSI is queried once per discovered page, per audit run; quota/rate-limit errors surface as friendly retry-later messages and do not fail the entire run — that page is marked as failed while the rest continue. If every page fails, the total-failure state is shown instead (see Core Flow step 4).
- Gemini free-tier requests are subject to Google's published rate limits (requests per minute and per day). A quota/rate-limit response from Gemini surfaces as a designed error state in the AI summary panel with a retry action, and does not block or invalidate the already-rendered dashboard results — the deterministic audit data remains visible and usable even if the AI summary fails outright. The same applies if the `comparePages` tool call itself fails or times out mid-conversation.
- Cheerio parses static HTML only — it does not execute JavaScript, so client-rendered (CSR) content on any audited page will not be reflected in the findings.

## Full Plan (Post-MVP)

Features and hardening intended for a full version of the product, beyond the capstone MVP:

### Product expansion

- Unlimited/arbitrary-depth full-site crawling (beyond the 10-page cap), with a proper job queue for large multi-page runs.
- User accounts and authentication, so audits can be tied to an owner.
- Audit history and persistence, with score trends over time (Supabase) — this would also let the chat endpoint fetch findings server-side instead of relying on the client to carry them.
- Scheduled recurring audits with email or in-app alerts when a score drops.
- Multi-tenant / white-label support for agencies managing audits across client sites.
- Retry-only-failed-pages for a partial run, instead of re-running the whole audit.
- Additional AI tools beyond `comparePages` (e.g. a fix-suggestion generator, or a tool letting the model re-fetch a single page on demand).

### Additional SEO checks

- HTTPS and mixed-content detection.
- Structured data / schema.org markup validation.
- Mobile-friendliness and viewport tag checks.
- hreflang and broken internal link detection (including cross-page link checks, which need the full page set, not just one page).
- URL canonicalization handling: following http→https, www vs non-www, and trailing-slash redirects before auditing.

### Platform and reliability

- Caching layer (Vercel KV or similar) for repeated audits of the same domain within a time window.
- Application-level rate limiting tied to user accounts, in addition to the platform-level protection — more consequential on a free-tier Gemini key than a paid one, since free-tier quota is shared across all users of the deployed app and easier to exhaust.
- Headless-browser rendering fallback (e.g. Puppeteer/Playwright) to capture client-rendered (CSR) content that Cheerio cannot see.
- URL validation and allowlisting on the audit endpoint to prevent the server from being used to reach internal or private network addresses when fetching a user-submitted domain.
- Error handling for malformed HTML or non-HTML responses returned by any target URL.
- True background job processing (e.g. a queue) so large multi-page runs aren't bound by a single serverless function's time limit.