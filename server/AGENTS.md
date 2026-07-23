# Server (NestJS API)

## Overview

NestJS 11 REST API backed by PostgreSQL through Prisma. It is the deterministic authority for availability, price, identity, authorization, and booking transitions. Domain rules (hours, slot step, cancellation cutoff) live in the `ShopSetting` table, never in code.

## Key files

| File | Owns |
| --- | --- |
| `src/modules/` | 12 feature modules: auth, availability, bookings, mail, master-data, permissions, pets, roles, services, shop-settings, staff, users |
| `src/modules/availability/availability.logic.ts` | Pure slot computation, unit tested in `availability.logic.spec.ts` |
| `src/common/guards/` | `JwtAuthGuard` (token check plus caching), `PermissionsGuard` (`resource:action`) |
| `src/common/utils/` | `password.util.ts` (argon2id plus pepper), `clock.util.ts` (mockable `now()`), `prisma-error.util.ts` (`translatePrismaError`) |
| `src/prisma/` | Prisma service with the soft delete client extension |
| `src/generated/prisma/` | Generated Prisma client (CommonJS, do not edit) |
| `prisma/schema.prisma` | Models: User, Pet, Service, ServiceTier, Booking, TimeOff, ShopSetting, RBAC tables, master data tables |
| `prisma/seed.ts` | Idempotent upsert seed: sizes, statuses, permissions, roles, admin user |

## Commands

```bash
npm run start:dev        # dev server (needs docker compose Postgres, port 5433)
npm test                 # unit tests (Jest, *.spec.ts under src/)
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

## Conventions

- Layering per module: controller → service → repository → Prisma. Services throw `HttpException` subclasses; repositories let Prisma errors surface, mapped by `translatePrismaError()` (P2002→409, P2025→404, P2003→400).
- DTOs live in `<module>/dto/` with `@ApiProperty`, `class-validator` rules, and a `static from()` mapper for responses. Global `ValidationPipe` runs with whitelist, forbidNonWhitelisted, and transform.
- RBAC is table driven (Role, Permission, RolePermission, UserRole), no enums. `*` is the super admin wildcard. JWT payload carries only `sub`; permissions resolve server side and are cached.
- Lookups (pet sizes, booking statuses, payment statuses) are master data tables (`Md*`), admin editable, never enums.
- Dates go through date-fns and `clock.util.ts` `now()`, never manual arithmetic or bare `new Date()` in logic.
- Error message strings live in `src/common/constants/`, never inline.
- See `docs/API-CONVENTIONS.md`, `docs/AUTH.md`, and `docs/RBAC.md` at the repo root for the full write ups.

## Gotchas

- Soft delete on User, Pet, and Service is a Prisma client extension that appends `deletedAt: null` to reads. To include deleted rows, mention `deletedAt` yourself in the `where` clause; that opts the query out.
- Postgres runs in docker compose on port 5433 on purpose (a local Windows Postgres owns 5432).
- Refresh tokens are single use, stored as sha256 hashes, and rotated on every refresh.
- `/uploads/` is served statically without a guard; pet photo URLs are unguessable but the files are public once known. Never put anything sensitive there.
- Passwords hash with argon2id plus `PASSWORD_PEPPER` from env. Never verify or hash without the pepper.

## Agent skills

- [nestjs-patterns](../.agents/skills/nestjs-patterns/): NestJS module, DTO, guard, and provider patterns used here.
- [prisma-patterns](../.agents/skills/prisma-patterns/): Prisma query and transaction traps.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
