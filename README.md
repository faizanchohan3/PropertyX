# Bismillah Pakistan

A real estate marketplace for Pakistan — buy, sell and rent homes, plots and commercial property, with AI search, verification, fraud detection, agent/agency/developer tools, rental management and an admin panel.

> **Status:** work in progress. The marketplace core, dashboards and admin panel are functional. Some public pages (projects, agent directory, area pages, calculators, blog, forum) are still being built — see [Roadmap](#roadmap).

## Stack

| Layer | Technology |
| --- | --- |
| Web app & REST API | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Database | PostgreSQL 17 with Drizzle ORM (full-text search + trigram indexes) |
| Maps | Leaflet + OpenStreetMap tiles; nearby places via the Overpass API |
| AI | Provider abstraction: rules engine (default, no key needed), Anthropic, OpenAI, Gemini |
| Payments | Pluggable gateway layer: built-in sandbox, JazzCash, Easypaisa |
| Notifications | In-app + outbox for email / SMS / WhatsApp / push (console providers in dev) |

## Monorepo layout

```
apps/web              Next.js site, dashboards, admin panel and /api/v1 REST API
packages/shared       Domain constants, PKR & marla/kanal units, calculators, RBAC matrix, zod schemas
packages/database     Drizzle schema (68 tables), migrations, reference data, demo seed
packages/auth         Sessions (JWT + revocable session rows), passwords, OTP, rate limiting, audit
packages/search       Listing search engine (filters, geo bbox/radius/polygon, clustering, autocomplete)
packages/ai           LLM providers, natural-language query parser, assistant, listing copywriter, lead scoring
packages/core         Domain services: listings, fraud, leads, chat, visits, verification, billing, ads, rentals, analytics…
packages/payments     Payment gateway adapters
packages/notifications Notification preferences, outbox and channel providers
scripts/              Dev database, seed, worker, smoke tests
```

## Getting started (local)

Requirements: **Node.js 20.12+**. No PostgreSQL install is needed for development — an embedded PostgreSQL is started from npm.

```bash
npm install
cp .env.example .env              # review values; AI keys are optional
npm run db:start                  # terminal 1 — keeps running (port 54329)
npm run db:migrate                # terminal 2
npm run db:seed                   # reference data + demo data (~1,400 listings, 8 cities)
npm run db:add-listings           # add 50 more demo listings to an existing database (no wipe; pass a number for more)
npm run dev                       # http://localhost:3100
```

Optional: `npm run worker` runs background jobs (listing expiry, alerts, rent reminders, notification delivery).
Stop the database with `npm run db:stop`.

### Demo accounts

All demo accounts use the password `Demo@12345` (email `<role>@bismillah.test`), and the login page has one-click buttons while demo mode is on:

`buyer`, `seller`, `agent`, `agency`, `developer`, `landlord`, `tenant`, `investor`, `manager` (property manager), `builder`, `support`, `moderator`, `admin`, `superadmin`.

All seeded agencies, agents, developers, projects and listings are **fictional demo data** (flagged `is_seed`) and labelled “Demo” in the UI. Calls/WhatsApp are disabled on demo listings.

## Configuration

See `.env.example`. Key settings:

- `DATABASE_URL` — any PostgreSQL 15+ (production should use a managed database; extensions `pg_trgm` is created by the migration runner).
- `AUTH_SECRET` — **required in production**, 32+ random characters.
- `AI_PROVIDER` — `rules` (default), `anthropic`, `openai` or `gemini`, with the matching API key. The AI never invents listings, prices or ownership facts; results always come from the database.
- `PAYMENT_GATEWAYS` — comma-separated, e.g. `sandbox` or `jazzcash,easypaisa` (with merchant credentials).
- `EMAIL_PROVIDER` / `SMS_PROVIDER` / `WHATSAPP_PROVIDER` / `PUSH_PROVIDER` — `console` in development.
- `STORAGE_PUBLIC_DIR` / `STORAGE_PRIVATE_DIR` — uploads. Private documents (CNIC, ownership papers) are never served statically; they stream only through an authorised route.

For production, load only reference data with `npm run db:reference` (never the demo seed).

## Testing

```bash
npm run typecheck
npm run smoke:pages     # with the dev server running: every dashboard/admin page per role
npm run smoke:flows     # end-to-end API flows (post → moderate → enquire → visit → chat → pay → verify)
```

## Features (implemented)

- Search with SEO routes (`/buy/house/lahore`, `/rent/flat/islamabad`, `/plots-for-sale/…`, `/commercial-property/…`), filters, sorting, saved searches with alerts
- Interactive map: price pins, clustering, search-as-you-move, draw-area and radius search, nearby schools/hospitals/mosques
- Property pages: gallery, video, 360° tour, floor plans, price history, financing estimate, nearby places, JSON-LD
- AI assistant (“5 marla house near DHA Lahore under 1.5 crore”, “show cheaper options”), AI listing copywriter, lead intent scoring
- 11-step listing wizard with photo upload (EXIF stripped, WebP), quotas per plan, moderation
- Five-level verification with private document storage; fraud detection (duplicate photos/text, suspicious price, phone reuse, scam language)
- Leads CRM, visit booking with calendar export, chat with attachments/voice notes and spam filtering
- Dashboards for owners, agents, agencies (team & permissions), developers (projects, units, payment plans), landlords/property managers and tenants
- Subscriptions, featured listings and advertising with a pluggable payment gateway layer
- Admin panel: moderation queues, users & roles, verification, fraud, reports, reviews, projects, areas, CMS, forum, ads, plans/payments, settings, audit log

## Roadmap

- Public pages: projects, agents/agencies/developers, area & society pages, investment opportunities, price index, calculators, comparison, blog, forum, help/legal
- Sitemap and robots, unit test suite, production deployment guide

## License

Proprietary — all rights reserved.
