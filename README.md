# SEO Audit Dashboard

An AI-powered web dashboard that audits a website's SEO health and explains the results in plain language.

## Background

Most SEO audit tools return raw technical data — pass/fail lists, scores, and jargon — that's hard for non-experts to act on. This project was built as a capstone during my front-end AI engineering internship at Flyrank AI to address that gap: it runs a technical SEO audit on a given URL, then uses an AI layer to summarize the findings and suggest concrete fixes in plain language, rather than just listing raw checks.

## What It Does

1. A user submits a URL.
2. The app scans the page for common technical SEO issues (title tags, meta descriptions, heading structure, alt text, canonical tags, robots.txt, sitemap.xml) and pulls a page speed score.
3. The findings are scored and displayed on a dashboard with charts and pass/fail breakdowns.
4. An AI assistant summarizes the top issues and recommends fixes in plain language.

## Features

- URL-based SEO audit
- Technical SEO checks (meta tags, headings, alt text, canonical tags, robots.txt, sitemap)
- Page speed scoring via Google PageSpeed Insights
- Overall SEO score (0–100)
- Visual dashboard (score cards, charts, pass/fail breakdown)
- AI-generated summary and fix recommendations

**Planned:**
- Historical audit tracking with score trends
- Side-by-side competitor comparison
- AI keyword/content gap suggestions
- Exportable PDF reports

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React / Next.js + Tailwind CSS |
| Charts | Recharts |
| Backend | Next.js API routes |
| SEO data | Google PageSpeed Insights API + Cheerio (HTML scraping) |
| AI layer | Claude API |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel + Supabase |

## Getting Started

```bash
git clone <repo-url>
cd seo-audit-dashboard
npm install
cp .env.example .env.local
# add your API keys
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
GOOGLE_PAGESPEED_API_KEY=
```

## Status

In development — capstone project, Flyrank AI internship.

## License

TBD