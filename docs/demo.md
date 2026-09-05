# Demo walkthrough — `comparePages` tool call end to end

> **Preview URL:** `https://abc-latrell26s-projects.vercel.app`
> (stable production alias — always serves the latest `main` build.
> Per-deployment URLs like `abc-ijypu0cd1-….vercel.app` are frozen
> snapshots and go stale after the next push.)
>
> **Tool definition file:** [`lib/ai/compare-pages.tool.ts`](../lib/ai/compare-pages.tool.ts)
> — contract documented in [`README.md`](../README.md) (`AI Tools` → `comparePages`).

## Setup

1. Confirm env vars are set in the Vercel project
   (`Settings → Environment Variables`):
   - `GEMINI_API_KEY` — required for the chat + tool call
   - `GOOGLE_PAGESPEED_API_KEY` — required for real page-speed data
2. Redeploy after setting them if the current deploy predates the values.

## Vercel time budget (deployed runs only)

The audit API runs under Vercel's 60s serverless limit. The route enforces
its own ~50s budget: past it, remaining pages are marked **skipped with a
reason** instead of killing the whole run, and the dashboard shows a partial
report with the "X of Y pages" banner (per-page reasons included). PageSpeed
calls get a 35s timeout plus one backoff retry (fast failures only — a
timed-out lab run is not retried), squeezed further as the budget runs low.
For the snappiest demo, audit a **mid-size site (≤6 pages)**. Any remaining
total failure now names its cause (e.g. `Audit request failed: HTTP 504`)
rather than the generic copy; a missing speed score renders as **N/A with
its reason** (e.g. rate-limit vs timeout) instead of a bare -1.

## Happy path — watch all four tool states + the component

1. Open the Preview URL → enter a **multi-page site** (a blog/news site
   with a sitemap, ideally 3–6 pages) → **Audit**.
2. Wait for the loading screen to finish → **Results** dashboard renders.
3. Open the **AI Summary** tab → wait for the auto-generated plain-language
   summary.
4. Ask: **“which page has the worst heading structure?”**
   (equivalents: *“rank the pages by page speed”*, *“which page has the
   worst alt text?”*).
5. Observe, in order:
   1. `input-streaming` — **“Checking pages…”** pulse (Gemini is deciding
      on arguments).
   2. `input-available` — chip **“Comparing pages by Heading structure”**.
   3. `output-available` — real component: **bar chart ranking the pages**
      with best/worst captions (not text/JSON).
   4. Gemini’s plain-language follow-up answer around the result.

## Error path — failed execution shows a designed error state

1. Run an audit on a **dead/unreachable domain** (e.g. a nonexistent
   subdomain). The pipeline stores a total-failure audit with
   `pages: []`; the dashboard shows its error UI but the AI Summary tab
   still mounts the chat.
2. In AI Summary, ask: **“which page is the best?”**
3. Observe: `execute` throws (nothing rankable) → the chat renders the
   **designed error card** with the failure reason and a **“Try again”**
   button that re-sends the question. No crash, no JSON dump.

## What to screenshot/record for the submission

- The metric chip (`input-available`).
- The bar chart with best/worst captions (`output-available`).
- The error card after the dead-domain audit (`output-error`).
- Optionally: a short screen recording of the full ask → chart flow.
