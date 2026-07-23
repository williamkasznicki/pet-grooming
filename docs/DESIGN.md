# Pet Grooming Management System — Design

Agreed via grilling session on 2026-07-22. This is the source of truth for v1 scope; change it here before changing code.

## Scope & tenancy

- **Single shop** — one business, its staff/admins, and its clients. No multi-tenancy in v1.

## Scheduling model

- **Per-groomer calendars.** A booking reserves a specific staff groomer for the service's duration. Clients pick a groomer or "any available".
- **Admin-managed availability**: admins set each staff member's working windows (e.g. Staff A 12:00–17:00), shop hours, and blocked periods. All stored in PostgreSQL-backed settings — never hardcoded (see AGENTS.md).
- The availability engine is deterministic and only offers slots inside those windows.

## Booking lifecycle

- **Instant confirm** on any valid open slot: `confirmed → in_progress → completed | cancelled | no_show`.
- Staff/admin can cancel or reschedule any booking.
- Cancellation cutoff is an admin setting.

## Services & pricing

- **Service × pet size tiers** (S/M/L/XL from the pet profile) define price and duration.
- Admin edits tiers globally in settings.
- Staff/admin can **override price and duration per booking**.
- Payment: **pay at shop** (cash/PromptPay at counter); staff mark paid on completion. Online deposits deferred.

## Auth & roles

- Email/password with **JWT access + refresh tokens**.
- **Table-driven RBAC** (no role enums): `User ↔ UserRole ↔ Role ↔ RolePermission ↔ Permission`, permissions named `resource:action` with `*` wildcard for super admin. Full convention + seeded roles: see `docs/RBAC.md`. Login/token flow, salt+pepper, and id-strategy rationale: `docs/AUTH.md`.
- **LINE Login scaffolded but stubbed** for future implementation. Never log LINE raw payloads, tokens, or owner contact details.

## Master data (no enums)

- Lookup values are admin-editable tables, not Prisma enums: `MdPetSize`, `MdBookingStatus`, `MdPaymentStatus` — each `(id, code, hexBgColorCode, hexTextColorCode, desc, isActive)`. Color codes drive UI badges.
- `TimeOff` blocked periods support: permanent (`isPermanent`), a specific datetime window (12 Aug 08:00–17:00), or a multi-day range (12–20 Aug) via nullable `startsAt`/`endsAt`; `staffId null` = shop-wide.

## Frontend

### Stack decisions (locked 2026-07-23)

- **Auth transport: BFF pattern** — Next.js route handlers (`/api/auth/*`) proxy the NestJS auth endpoints and keep access/refresh tokens in **httpOnly cookies**; browser JS never sees tokens. API calls to NestJS go through the BFF proxy which attaches the Bearer header server-side and transparently refreshes on 401 (single-flight).
- **HTTP client: axios only** — one configured axios instance for the BFF (browser→Next) and one for the proxy (Next→NestJS). No other fetching libraries.
- **i18n: Thai + English from day one** via next-intl — every UI string goes through translations; **English is the default locale**.
- **Components: shadcn/ui (already scaffolded, monorepo flow)** — shared components live in `client/packages/ui` (`base-lyra` style, Remix icons); add via `npx shadcn@latest add <component>` per <https://ui.shadcn.com/docs/monorepo>. Never hand-roll a widget shadcn provides.

- One Next.js app (`client/apps/web`) with route groups:
  - `(client)/` — booking-facing pages
  - `(admin)/` — staff/admin pages behind RBAC middleware
  - Each group has its own root layout, nav, and theme.
- **Design system: "spa lagoon" (locked 2026-07-23, from the approved Stitch comp — project `13714251940461288007`; supersedes "wash station")** — single source of truth is `client/packages/ui/src/styles/globals.css`:
  - Palette (oklch tokens, light + dark): **lagoon** `#14b8a6` primary CTAs/accents, deep teal `#006b5f` brand text, **navy ink** `#0b1c30` text + dark pill buttons, cool blue-white `#f8f9ff` canvas, sky-blue `#d3e4fe` chips/badges. Dark mode is navy-based.
  - Type: **Anuphan** everywhere (`--font-sans`) — bold tight-tracked (`-0.02em`) headings stand in for the comp's Inter with native Thai glyphs; **Geist Mono** for prices/codes.
  - Shape/motion: radius `0.75rem`, fully-rounded pills; `animate-rise` staggered reveals; landing `lagoon-blob` morph + `water-fill` card hover. All motion respects `prefers-reduced-motion`.
  - Signature: **dark navy admin sidebar with lagoon active pill** (`--sidebar-*` tokens), shadcn sidebar shell (`components/admin-shell.tsx`, from shadcnblocks `application-shell1`: collapsible to icons, sheet on mobile, breadcrumb topbar). Components must use tokens, never hex literals (master-data badge colors are the one data-driven exception).
  - Stitch comps are the reference for screens (landing, wizard, bookings, admin dashboard/bookings/roles); fetch via the `stitch` MCP server.
- Booking rules shown to clients come from `GET /booking-rules` (public projection of `ShopSetting`) — rendered by `components/booking-rules.tsx`, never hardcoded.
- Design workflow: `frontend-design` skill for direction (constrained to these tokens), `design-system` for token generation/audit, `web-design-guidelines` for review, `dataviz` for admin charts.

## Server conventions

- See `docs/API-CONVENTIONS.md`: built-in Nest mechanisms first, centralized error messages, DTO `from()` mapping, Swagger at `/docs`, and the Prisma soft-delete global query filter.

## Backend & data

- NestJS (`server/`) + **Prisma + PostgreSQL** (Docker Compose locally).
- Core entities: `User` (+ `UserRole`/`Role`/`RolePermission`/`Permission`, `RefreshToken`), `Pet`, `Service` + `ServiceTier`, `StaffProfile` + `WorkingHours` + `TimeOff`, `Booking` + `BookingStatusEvent`, master data `MdPetSize`/`MdBookingStatus`/`MdPaymentStatus`, `ShopSetting`. Master data + RBAC rows are seeded via `prisma/seed.ts`.

## AI integration (runtime) — implemented

- **OpenRouter** via Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`), called **only** from the NestJS `AiModule` (`src/modules/ai`). Key lives in `server/.env` (`OPENROUTER_API_KEY`), never in the client. Model is `OPENROUTER_MODEL` (default a **free** tool-capable model, `openai/gpt-oss-20b:free`).
- AI is the **intent/explanation layer only** — it has four **read-only** tools (`list_services`, `get_booking_rules`, `get_my_pets`, `check_availability`) that call the deterministic services. It never creates or changes bookings; it hands the customer to the Book page.
- `POST /ai/chat` (authenticated) runs the model with `generateText` + `stopWhen: stepCountIs(6)`. `GET /ai/status` reports whether the key is set; without it the endpoint 503s and the client widget hides. Client widget: `components/chat-assistant.tsx`, mounted in the (client) layout. AI path gets a 90s timeout (browser axios + BFF proxy).
- Pipeline explainer artifact: published to claude.ai (see the AI commit).

## Auth 2FA & password reset — implemented

- Login is two steps when `LOGIN_OTP_ENABLED` (default on): `POST /auth/login` verifies the password and emails a 6-digit code, returning a challenge; `POST /auth/login/verify` checks the code and issues tokens. Set `LOGIN_OTP_ENABLED=false` for single-step.
- Forgot/reset: `POST /auth/forgot-password` always returns ok (no account enumeration); `POST /auth/reset-password` verifies the newest reset code, updates the hash, and revokes all sessions.
- Codes: `VerificationCode` table, sha256-hashed, 10-min TTL, 5-attempt cap, single use. `AUTH_DEV_ECHO_OTP=1` echoes codes in non-prod responses for local testing (double-gated). See `docs/AUTH.md`.

## Notifications

- **Email only in v1** (e.g. Resend): booking confirmations + reminders. Reminder timing is an admin setting. LINE Messaging API push comes later via the LINE scaffold.

## Build order

1. Docker Compose Postgres + Prisma schema
2. Auth (JWT access/refresh) + RBAC
3. Settings module (shop hours, staff windows, tiers, cutoffs)
4. Availability engine
5. Booking API + lifecycle + email notifications
6. Frontend `(client)` booking flow
7. Frontend `(admin)` management + dashboard
8. AI booking assistant (`AiModule` + chat UI)
