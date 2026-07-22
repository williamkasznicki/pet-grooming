# Server API Conventions

Rules for `server/` code. Built-in NestJS mechanisms first — custom code only when a built-in can't do it.

## Built-ins first (priority order)

| Concern | Use | Custom allowed when |
|---|---|---|
| Body validation | Global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) + class-validator DTOs | never — every body goes through a DTO |
| Param parsing | Built-in pipes: `ParseIntPipe` for numeric params (e.g. future `roleId`, `permissionId`), `ParseBoolPipe`, `ParseEnumPipe`. Entity ids are cuid **strings** — no pipe needed | a shared `ParseCuidPipe` only if malformed-id 400s become a real need |
| Expected errors | Built-in `HttpException` subclasses (`NotFoundException`, `ConflictException`, `BadRequestException`…) thrown at the **service** boundary | never throw raw `Error` for expected cases |
| Prisma errors | `translatePrismaError()` (P2002→409, P2025→404, P2003→400) in every service `try/catch` around writes | — |
| Error envelope | Nest's default exception filter | one global custom filter later if the frontend needs a custom shape |
| Cross-cutting response logic | Interceptors (planned: logging + request-id) | — |

## Messages & mapping

- User-facing error strings live in `src/common/constants/error-messages.constant.ts` — never inline.
- Entity → response mapping lives on the response DTO as `static from(entity)`. Services never hand-build response objects, controllers never see Prisma entities.
- Request/response DTOs carry `@ApiProperty` decorators — Swagger UI at `/docs`, JSON at `/docs-json`. (The `@nestjs/swagger` CLI plugin is banned: it emits absolute src-path `require()`s under our nodenext setup.)
- `PartialType` comes from `@nestjs/swagger`, not `@nestjs/mapped-types` (keeps doc metadata).

## Soft delete (global query filter)

`PrismaService.client` is a Prisma client extension that auto-appends `deletedAt: null` to read queries (`findMany`, `findFirst`, `findFirstOrThrow`, `count`, `aggregate`, `groupBy`) on models listed in `SOFT_DELETE_MODELS` (`User`, `Pet`, `Service`) — the EF Core "global query filter" equivalent.

- **Always query through `prisma.client`** — the raw base client is private by design.
- Opt out by mentioning `deletedAt` in `where` yourself: `{ deletedAt: { not: null } }` lists only deleted rows (admin restore screens).
- `findUnique*` is exempt (its `where` must stay a pure unique constraint) — use `findFirst` for filtered single-row reads.
- Adding a new soft-deletable model = add `deletedAt DateTime?` in schema **and** its name to `SOFT_DELETE_MODELS`.
- `isActive` (master data, services) is **not** auto-filtered on purpose: admin screens must list inactive rows to re-enable them. Client-facing queries filter `isActive: true` explicitly.

## Dates & times

- All date math via **date-fns** (+ `@date-fns/tz`) — no manual `Date` arithmetic (`getTime()` offsets, etc.).
- Store UTC; interpret shop-local values (working hours, slots) in the shop timezone from settings (`shop.timezone`). See docs/AUTH.md → Date/time policy.

## Passwords

- Only ever hash/verify through `src/common/auth/password.util.ts` (argon2id + salt + `PASSWORD_PEPPER`). Never call argon2 directly. See docs/AUTH.md.

## Checklist for a new endpoint

1. DTO with class-validator + `@ApiProperty` in the module's `dto/`.
2. Thin controller: `@ApiTags`, `@ApiOkResponse`/`@ApiCreatedResponse`, built-in pipes on params.
3. Service does the work through `prisma.client`, throws built-in exceptions with `ErrorMessages`, wraps writes with `translatePrismaError`.
4. Response via `SomeResponseDto.from(...)`.
