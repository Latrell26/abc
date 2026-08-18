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
4. An AI chat assistant summarizes the top issues in plain language, and can be asked follow-up questions about the audit.

## Screens

1. **Home / audit input** — URL input form with validation and submit.
2. **Loading** — processing state while the audit runs (scrape → PSI → AI), with step indicators.
3. **Results dashboard** — overall score (0–100), pass/fail breakdown by check, Recharts visualizations.
4. **AI summary chat** — a streaming chat that auto-generates a plain-language summary of the top issues on load, then answers follow-up questions (streaming token-by-token, with a Stop control).
5. **Error states** — invalid URL, unreachable site, PSI quota/rate-limit, AI failure; each with a clear retry or next-step message.

## Data Sources

- User-submitted URL (input).
- Target page HTML via Cheerio — title, meta description, heading structure, alt text, canonical tag.
- robots.txt and sitemap.xml fetched from the target origin.
- Google PageSpeed Insights API — page speed scores.
- Gemini API (free tier) — consumes the aggregated findings to produce the AI summary and answer follow-up questions (AI layer, not a raw SEO data source).

## Where the AI Lives

- A streaming Gemini model call via the Vercel AI SDK, in the chat API route, executed after the audit findings are available.
- Input: the full conversation history (UI messages converted server-side), seeded with a system prompt containing the structured audit findings.
- Output: a token-by-token UI message stream rendered in the client chat (supports stopping mid-stream).
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
