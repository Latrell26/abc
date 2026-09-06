# SEO Audit Dashboard

An AI-powered web dashboard that audits a website's SEO health and explains the results in plain language.

For the product spec — target user, core flow, screens, data sources, AI architecture, and out-of-scope — see [SPEC.md](./SPEC.md).

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run lint      # lint
npm test          # run tests
```

## Features

- URL-based SEO audit
- Technical SEO checks (meta tags, headings, alt text, canonical tags, robots.txt, sitemap)
- Page speed scoring via Google PageSpeed Insights
- Overall SEO score (0–100)
- Visual dashboard (score cards, charts, pass/fail breakdown)
- AI-generated summary and fix recommendations
- Streaming AI chat assistant — token-by-token summaries plus follow-up Q&A
- `comparePages` AI tool — the assistant ranks audited pages by any SEO metric (rendered as a bar chart, not text)

## AI Tools

### `comparePages`

Server-side tool the assistant calls for page-comparison questions
(“which page has the worst heading structure?”). Defined in
[`lib/ai/compare-pages.tool.ts`](./lib/ai/compare-pages.tool.ts), wired into
[`app/api/chat/route.ts`](./app/api/chat/route.ts).

**Input schema** (Zod — one field, kept small on purpose):

```ts
{ metric: "score" | "pageSpeed" | "titleTag" | "metaDescription"
  | "headingStructure" | "altText" | "canonicalTag" }
```

**Return shape** (`ComparePagesOutput`):

```ts
{
  metric: /* the requested metric */,
  ranking: [{ url, value, issues, overallScore }], // best-first for scores, worst-first for checks
  bestUrl: string,
  worstUrl: string,
  skippedCount: number, // pages excluded (failed to audit)
}
```

- Numeric metrics (`score`, `pageSpeed`) rank by that value, best first;
  pages with a failed speed fetch (`-1`) sort last.
- Check metrics rank by issue count in that category (`fail` = 2,
  `partial` = 1, `pass` = 0); ties break by overall score, lowest first.
- `execute` reads only the per-page data already in the request (`pages`
  on the audit payload) — no re-scraping, no external calls.

**Error contract:** `execute` throws when there is nothing to rank (no
per-page data, e.g. an audit stored before this field existed, or no
successful pages). The SDK surfaces that as the tool part's `output-error`
state, rendered in the chat as a designed retry card — never a crash.

**Rendered states** (see `ComparePagesToolView` in
[`components/chat.tsx`](./components/chat.tsx)):

| Tool part state | What the user sees |
|---|---|
| `input-streaming` | “Checking pages…” pulse — the model is deciding on arguments |
| `input-available` | Chip naming the chosen metric (“Comparing pages by …”) |
| `output-available` | Real component: [`PageComparisonChart`](./components/page-comparison-chart.tsx) (Recharts horizontal bars + best/worst captions) |
| `output-error` | Designed error card with the failure reason and a “Try again” button that re-sends the question |

**Planned:**
- Historical audit tracking with score trends (requires a persistence layer — see Out of Scope)
- Side-by-side competitor comparison
- AI keyword/content gap suggestions
- Exportable PDF reports

## Out of Scope

Deferred features and technical non-goals — see [SPEC.md](./SPEC.md).

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React / Next.js (App Router) + Tailwind CSS |
| Charts | Recharts |
| Backend | Next.js API routes |
| SEO data | Google PageSpeed Insights API + Cheerio (HTML scraping) |
| AI layer | Gemini API (free tier) via Vercel AI SDK |
| Database | None (MVP) — audits are ephemeral |
| Hosting | Vercel |

## Deployment notes

The audit route runs on Vercel Fluid compute (`vercel.json`:
`"fluid": true`, `maxDuration: 300`), so the Hobby ceiling is 300s and
a full 10-page run with PageSpeed per page fits. The route budgets ~290s
with an absolute stop at ~294s: each page gets a 70s PageSpeed timeout
plus one backoff retry, the submitted URL is audited first, and if the
budget ever runs out the remainder still reports checks-only (speed
`N/A` + reason) — a page is only marked failed when it can't even be
scraped, with the actual cause recorded per page.

## Getting Started

```bash
git clone <repo-url>
cd abc
npm install
cp .env.example .env.local
# add your API keys
npm run dev
```

## Status

In development — capstone project, FlyRank AI internship.

## License

MIT
