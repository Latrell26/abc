# SEO Audit Dashboard — Product Spec

An AI-powered web dashboard that audits a website's SEO health and explains the results in plain language.

## Problem

Most SEO audit tools return raw technical data — pass/fail lists, scores, and jargon — that's hard for non-experts to act on. This project was built as a capstone during my front-end AI engineering internship at FlyRank AI to address that gap: it runs a technical SEO audit on a given URL, then uses an AI layer to summarize the findings and suggest concrete fixes in plain language, rather than just listing raw checks.

## Target User

Small-business owners and non-technical site owners who want to know — in plain language — what's hurting their site's SEO and how to fix it. The tool is deliberately the opposite of the raw pass/fail dashboards most SEO tools produce: it explains issues in terms of what they mean and what to do next.

## Core Flow

1. A user submits a URL.
2. The app scans the page for common technical SEO issues (title tags, meta descriptions, heading structure, alt text, canonical tags, robots.txt, sitemap.xml) and pulls a page speed score.
3. The findings are scored and displayed on a dashboard with charts and pass/fail breakdowns.
4. An AI assistant summarizes the top issues and recommends fixes in plain language.

## Screens

1. **Home / audit input** — URL input form with validation and submit.
2. **Loading** — processing state while the audit runs (scrape → PSI → AI), with step indicators.
3. **Results dashboard** — overall score (0–100), pass/fail breakdown by check, Recharts visualizations.
4. **AI summary panel** — plain-language summary of top issues and prioritized fix recommendations.
5. **Error states** — invalid URL, unreachable site, PSI quota/rate-limit, AI failure; each with a clear retry or next-step message.

## Data Sources

- User-submitted URL (input).
- Target page HTML via Cheerio — title, meta description, heading structure, alt text, canonical tag.
- robots.txt and sitemap.xml fetched from the target origin.
- Google PageSpeed Insights API — page speed scores.
- Claude API — consumes the aggregated findings to produce the AI summary (AI layer, not a raw SEO data source).

## Where the AI Lives

- A single Claude API call in the backend audit route, executed after all deterministic checks finish.
- Input: structured audit findings (checks, pass/fail status, scores, PSI result).
- Output: a plain-language summary and prioritized fix recommendations.
- The overall score is computed deterministically in code (rule-based), not by the AI, so results stay reproducible and auditable.

## Out of Scope

Explicitly deferred for the capstone MVP:

- User accounts / authentication
- Audit history, persistence, and score trends (needs Supabase or similar — tracked under Planned)
- Batch / multi-URL audits and job queues
- Caching (Vercel serverless is stateless; would need a managed store such as Vercel KV)
- Rate-limiting logic in app code (rate limiting is handled at the platform level via a Vercel Firewall WAF rule on the audit endpoint; PSI quota errors surface as friendly retry-later messages)

## Technical Constraints

- Deployed on Vercel serverless functions; the runtime is stateless and ephemeral, so there is no in-app caching or in-memory state. Anything shared requires a managed store (e.g. Vercel KV), which is deferred.
- No persistence in the MVP; audits are ephemeral.
- Rate limiting is handled at the platform level (Vercel Firewall WAF rule on the audit endpoint), not in app code.
- PSI is queried on demand, one URL per audit; quota/rate-limit errors surface as friendly retry-later messages.

## Why This Stack

Next.js (App Router) was chosen because it gives built-in API routes for server-side scraping — Cheerio has to run server-side to avoid CORS errors when fetching arbitrary external sites — plus SSR out of the box, which matters for a dashboard that should load fast and stay crawlable itself. Tailwind keeps the UI layer fast to build without a separate design system, and Recharts was picked over heavier charting libraries since the dashboard only needs simple score cards and pass/fail visualizations, not complex custom charts. Claude API handles the plain-language summary and fix recommendations, kept deliberately separate from the deterministic scoring logic so results stay reproducible and auditable — the AI explains, it doesn't grade. Supabase and Vercel KV were considered but deferred for the MVP, since the MVP has no auth or persistence needs (see Out of Scope); Supabase remains on the roadmap for audit history and score trends.
