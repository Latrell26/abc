# AGENTS.md

## Purpose
SEO Audit Dashboard — AI-powered tool that audits a website's SEO health and explains results in plain language. Capstone project, FlyRank AI internship.

## Assistant
- OpenCode (terminal-based AI coding agent)

## Stack
- Node.js (LTS), Git
- Next.js / React + Tailwind CSS, Recharts
- Google PageSpeed Insights API, Cheerio (HTML scraping)
- Supabase (PostgreSQL), Claude API

## Commands
- npm run dev       # start dev server
- npm run build     # production build
- npm run lint      # lint
- npm test          # run tests

## Agents
- frontend (React/Next.js, Tailwind, Recharts) — .opencode/agents/frontend.md
- backend (API routes, scraping, Supabase, AI layer) — .opencode/agents/backend.md

## Conventions
- Commits follow Conventional Commits
- No secrets committed; API keys live in .env.local
- Keep README accurate and up to date with repo purpose
- Keep subagents' model, permissions, and responsibilities accurate
