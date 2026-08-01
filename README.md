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
| Frontend | React / Next.js + Tailwind CSS |
| Charts | Recharts |
| Backend | Next.js API routes |
| SEO data | Google PageSpeed Insights API + Cheerio (HTML scraping) |
| AI layer | Claude API |
| Database | None (MVP) — audits are ephemeral |
| Hosting | Vercel |

## Getting Started

```bash
git clone <repo-url>
cd abc
npm install
cp .env.example .env.local
# add your API keys
npm run dev
```

## Environment Variables

```
ANTHROPIC_API_KEY=
GOOGLE_PAGESPEED_API_KEY=
```

## Status

In development — capstone project, FlyRank AI internship.

## License

MIT