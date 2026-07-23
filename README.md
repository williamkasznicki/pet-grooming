# Pet Grooming Management System

Booking and scheduling for a single grooming shop: clients book by service and
their pet's **weight** (the server derives the price band), groomers get
per-staff calendars with admin-managed availability windows, and everything is
governed by table-driven RBAC and admin-editable shop settings.

| Piece     | Stack                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| `server/` | NestJS 11 · Prisma 7 (driver adapter) · PostgreSQL 17 · argon2id · JWT + RBAC   |
| `client/` | Turborepo · Next.js 16 (App Router) · Tailwind v4 + shadcn (Base UI) · next-intl (en/th) |

## Prerequisites

- Node.js ≥ 20 (npm workspaces — no pnpm)
- Docker (for PostgreSQL)

## 1. Database

```sh
docker compose up -d
```

Starts PostgreSQL 17 on host port **5433** (5432 is intentionally left free —
see `docker-compose.yml`). Data persists in the `pgdata` volume.

## 2. Backend (`server/`)

```sh
cd server
npm install
cp .env.example .env    # then fill in the secrets below
npm run prisma:generate
npm run prisma:migrate  # applies migrations
npm run db:seed         # idempotent: roles/permissions, size bands, services, admin user
npm run start:dev       # http://localhost:4000 · Swagger at /docs
```

`.env` essentials (never commit `.env`):

- `DATABASE_URL` — matches the compose defaults out of the box
- `PASSWORD_PEPPER`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random
  strings. Changing the pepper invalidates **every** stored password hash.
- `RESEND_API_KEY` / `MAIL_FROM` — booking emails (optional in dev)
- `OPENROUTER_API_KEY` — AI booking assistant (optional)

Seeded admin: `admin@petcrm.local` / `admin1234` (override with `SEED_ADMIN_EMAIL`
/ `SEED_ADMIN_PASSWORD` before seeding; change it anywhere near production).

## 3. Frontend (`client/`)

```sh
cd client
npm install
cp apps/web/.env.example apps/web/.env.local   # API_URL=http://localhost:4000
npm run dev                                    # http://localhost:3000
```

The Next.js app is a BFF: tokens live in httpOnly cookies and browser JS talks
only to `/api/proxy/*`, which attaches the Bearer token server-side.

## Everyday commands

| Where     | Command             | What                                            |
| --------- | ------------------- | ----------------------------------------------- |
| `server/` | `npm test`          | unit tests (availability engine, services)      |
| `server/` | `npm run build`     | compile check                                   |
| `client/` | `npm run typecheck` | `tsc --noEmit` across the workspace             |
| `client/` | `npm run lint`      | eslint (React Compiler rules on)                |
| `client/` | `npm run build`     | production build                                |

Run the server checks and client checks before every handoff (see `AGENTS.md`).

## Where the rules live

Domain rules are **PostgreSQL-backed settings**, never hardcoded in clients:
shop hours, slot step, minimum notice, cancellation cutoff (`ShopSetting` table,
admin UI at `/admin/settings`, public read at `GET /booking-rules`). Master data
(size bands, statuses) and RBAC (roles ↔ permissions) are tables too, editable
at `/admin/sizes` and `/admin/users`.

## Docs

- [docs/DESIGN.md](docs/DESIGN.md) — locked product/architecture decisions + design system
- [docs/API-CONVENTIONS.md](docs/API-CONVENTIONS.md) — layering, DTO mapping, date rules
- [docs/AUTH.md](docs/AUTH.md) — login flow, salt+pepper hashing, token rotation
- [docs/RBAC.md](docs/RBAC.md) — permission naming, wildcard, cache invalidation

## Repo layout

```
pet-crm/
├─ docker-compose.yml      # PostgreSQL 17 (host port 5433)
├─ server/                 # NestJS API — controller → service → repository
│  ├─ prisma/              # schema, migrations, idempotent seed
│  └─ src/modules/…        # auth, users, roles, pets, services, bookings, …
├─ client/                 # Turborepo
│  ├─ apps/web/            # Next.js app — (client) + (admin) route groups, BFF
│  └─ packages/ui/         # shared shadcn components + design tokens (globals.css)
└─ docs/                   # decision records
```
