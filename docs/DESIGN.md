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

- Email/password with **JWT access + refresh tokens** and **RBAC**: `client`, `staff`, `admin`.
- **LINE Login scaffolded but stubbed** for future implementation. Never log LINE raw payloads, tokens, or owner contact details.

## Frontend

- One Next.js app (`client/apps/web`) with route groups:
  - `(client)/` — booking-facing pages
  - `(admin)/` — staff/admin pages behind RBAC middleware
  - Each group has its own root layout, nav, and theme.
- **UI foundation (respect it, don't replace it)**: shadcn/ui `base-lyra` style, neutral base color, CSS variables, Remix icons, dark mode via `theme-provider.tsx`, shared components in `client/packages/ui`.
- Design workflow when frontend starts: `frontend-design` skill for direction (constrained to existing tokens), `design-system` for token generation/audit, `web-design-guidelines` for review, `dataviz` for admin charts.

## Backend & data

- NestJS (`server/`) + **Prisma + PostgreSQL** (Docker Compose locally).
- Core entities: `User`, `Pet` (owner, size, breed, notes), `Service` + `ServiceTier`, `StaffProfile` + `WorkingHours`, `Booking` (+ overrides, status history), `ShopSetting`.

## AI integration (runtime)

- **OpenRouter** via Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`), called **only** from a NestJS `AiModule`. Key lives in `server/.env` (`OPENROUTER_API_KEY`), never in the client.
- AI is the **intent/explanation layer only**. Availability, price, identity, authorization, and booking transitions are deterministic server responsibilities.
- **v1 feature: booking assistant chat** — parses requests like "bath + nail trim for my poodle Friday afternoon" via tool-calling into check-availability / create-booking service calls. Streaming responses to the client through NestJS endpoints.
- Model routing: capable model (e.g. `anthropic/claude-sonnet-5`) for the assistant; cheap model reserved for future summaries.

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
