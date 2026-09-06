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

The audit API runs on Vercel **Fluid compute: 300s ceiling**
(`vercel.json` sets `"fluid": true` and `maxDuration: 300` for
`/api/audit`). The route enforces its own ~290s budget with an absolute
stop at ~294s — so a **full 10-page audit with PageSpeed per page now
fits** (~60–180s for real sites, 3 pages at a time). The URL you typed
jumps to the front of the queue so the trimmed page is never the one you
asked about, and the dashboard's "Pages audited" table lists all 10 with
per-page reasons for anything incomplete.

Safety nets (rarely fire with the new ceiling): PageSpeed calls get a 70s
timeout plus one backoff retry (fast failures only, squeezed further as
the budget shrinks); if the budget ever runs out, remaining pages are
still fully checked with **speed N/A + reason**; past the hard stop the
page is marked **failed with its cause**. Total failure still names its
cause (e.g. `Audit request failed: HTTP 504`); missing speed renders as
**N/A with its reason** (e.g. rate-limit vs timeout) instead of a bare -1.

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
