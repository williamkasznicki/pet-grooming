<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Overview

Turborepo workspace for the web frontend. `apps/web` is the Next.js app (App Router, next-intl for Thai and English). `packages/ui` holds the shared shadcn/ui components and the design tokens. `packages/eslint-config` and `packages/typescript-config` hold shared tool config.

## Key files

| File | Owns |
| --- | --- |
| `apps/web/app/[locale]/(client)/` | Customer pages: home, login, register, book, bookings, pets |
| `apps/web/app/[locale]/(admin)/admin/` | Admin pages: dashboard, bookings, staff, services, sizes, users, settings |
| `apps/web/app/api/auth/[action]/` | BFF auth routes: login, refresh, logout (cookies set here) |
| `apps/web/app/api/proxy/[...path]/` | Authenticated proxy to the NestJS API |
| `apps/web/hooks/useAxios.ts` | Browser axios bound to `/api/proxy`, attaches token, handles 401 refresh |
| `apps/web/hooks/useMutation.ts` | Generic mutation hook with shared error handling |
| `apps/web/hooks/book/` | Booking wizard reducer state machine (`useBookingWizard.ts`, `bookingState.ts`) |
| `apps/web/lib/auth/` | Session cookies, auth context, single flight refresh dedup |
| `packages/ui/src/styles/globals.css` | Design tokens (Tailwind v4, oklch, spa lagoon palette) |

## Commands

```bash
npm run dev         # turbo dev (needs the server running on port 4000)
npm run typecheck   # required before handoff
npm run build       # required before handoff
npm run lint
```

## Conventions

- All HTTP goes through the BFF: browser code calls `/api/proxy` via axios (`lib/api/client.ts` or `useAxios`), never the NestJS API directly. Server side code uses `lib/api/nest.ts`.
- Every UI string goes through next-intl (Thai and English, English default). No hardcoded copy.
- Styling uses design tokens only, no raw hex in components. Tokens live in `packages/ui/src/styles/globals.css` (spa lagoon palette, Anuphan font, navy sidebar even in light mode).
- Components come from `packages/ui` (shadcn registry); add new ones there, not in the app.
- Complex flows use reducer state machines (see the booking wizard); auth state lives in React context, no global store.
- Env: `apps/web/.env.example` (`API_URL`, `NEXT_PUBLIC_ASSET_URL`). Turbo tasks read `API_URL`, `NODE_ENV`, `ALLOW_INSECURE_COOKIES`.

## Gotchas

- Domain rules (booking hours, cutoffs, slot steps) always come from the server's settings API. Never hardcode them here.
- Token refresh is single flight (`lib/auth/single-flight.ts`); do not add a second refresh path.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
