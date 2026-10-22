# SubAudit

A plain list of your subscriptions, what they cost (from numbers **you** enter), and reminders before they renew.
No bank linking. No account required. No invented savings.

**Live:** https://subaudit.vercel.app

## Features
- **Dashboard** — monthly burn, annual total, amount due in the next 30 days (per currency, never converted), category chart, search / filter / sort. Unknown prices stay "Unknown" and are excluded from totals with a visible note.
- **Add / edit** — name, cost, currency, monthly/annual, next renewal, category (editable list), cancel URL, notes, status (active / reviewing / keeping / canceling / canceled).
- **Paste a statement** — regex extraction in the browser; optional AI extraction when `OPENAI_API_KEY` is set. Results are suggestions you edit and confirm — never auto-added.
- **Reminders** — 30-day upcoming list, in-app notifications for the next 7 days, snooze 7 days, opt-in email reminders 7 days and 1 day before renewal (Vercel Cron + Resend).
- **Cancel help** — catalog of 22 popular services with official cancel/account links and short steps (`/cancel`), generic guidance otherwise; mark canceled → archived.
- **Reports** — print / save-as-PDF view and read-only share links. Local mode encodes the selected rows in the URL fragment (never sent to the server); signed-in users get revocable server-side snapshot links. Notes are excluded unless you opt in.
- **Local mode by default** (localStorage). Signing in is optional; after sign-in you explicitly turn on cloud save and choose whether to import your local list.

## Stack
Next.js 15 (App Router, TypeScript) · Tailwind v4 + shadcn/ui · Drizzle ORM + Neon Postgres · Auth.js (NextAuth v5) · zod · Recharts.

## Local setup
```bash
npm install
npm run dev          # http://localhost:3000 — works with no env vars (local mode, sign-in disabled)
npm test             # unit tests (totals, renewal math, parsing, share encoding, catalog)
node tests/e2e.mjs   # browser flow test against a running server (BASE=http://localhost:3000)
```

With a database:
```bash
cp .env.example .env.local   # fill DATABASE_URL, AUTH_SECRET, and a provider
npm run db:migrate           # applies ./drizzle migrations
npm run db:seed              # seeds the cancel_catalog table
```

## Environment variables
| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon). Required for cloud save / share links / email reminders |
| `AUTH_SECRET` | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` | Email magic-link sign-in via Resend (verified sender domain) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub sign-in (alternative to email) |
| `RESEND_API_KEY` | Sends reminder emails |
| `CRON_SECRET` | Protects `/api/cron/reminders` (Vercel sends it automatically) |
| `OPENAI_API_KEY` | Optional AI extraction for pasted text |

Sign-in turns on only when `DATABASE_URL` + `AUTH_SECRET` + at least one provider are set; otherwise the Account page says so and the app stays in local mode.

## Deploy to Vercel
1. Import the repo in Vercel (or `vercel link`).
2. Add Neon from the Marketplace (Free plan): `vercel integration add neon --plan free_v3` — sets `DATABASE_URL`.
3. `vercel env add AUTH_SECRET` / `CRON_SECRET` (and a provider + `RESEND_API_KEY` if wanted).
4. `npm run db:migrate && npm run db:seed` with the production `DATABASE_URL`.
5. `vercel --prod`. `vercel.json` registers a daily cron at 13:00 UTC for reminders.

**Custom domain:** something like `subaudit.app` — add it under Project → Domains and update `EMAIL_FROM` to a verified address on that domain.

## Principles
All numbers come from user data. Missing data stays missing. Currencies aren't converted. No savings estimates.
Rate limiting is a simple in-memory per-IP window (per serverless instance) — fine for an MVP; use Upstash/Vercel KV for stricter limits.
