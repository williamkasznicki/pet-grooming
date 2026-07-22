# Authentication — how login works

## Login flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Next.js)
    participant A as AuthController
    participant S as AuthService
    participant DB as PostgreSQL

    C->>A: POST /auth/login { email, password }
    A->>S: login(dto)
    S->>DB: SELECT user WHERE email = lower(email)
    DB-->>S: user row (with passwordHash)
    S->>S: argon2.verify(passwordHash, password, { secret: PEPPER })
    alt wrong email or password
        S-->>C: 401 Invalid email or password
    else verified
        S->>S: sign JWT access token { sub: userId } (TTL 15m)
        S->>S: refreshToken = 48 random bytes (base64url)
        S->>DB: INSERT RefreshToken { tokenHash: sha256(refreshToken), expiresAt }
        S->>DB: resolve roles → permissions (UserRole → RolePermission → Permission)
        S-->>C: { accessToken, refreshToken, user { roles, permissions } }
    end

    Note over C: store tokens; send Authorization: Bearer accessToken

    C->>A: GET /pets (Bearer accessToken)
    A->>A: JwtAuthGuard: verify signature + expiry
    A->>DB: load user + permissions (60s cache)
    A->>A: PermissionsGuard: has 'pet:read' or '*'?
    A-->>C: 200 data (or 401 / 403)

    Note over C: access token expired (15m)
    C->>A: POST /auth/refresh { refreshToken }
    A->>DB: find by sha256(refreshToken) — not revoked, not expired
    A->>DB: revoke presented token (single-use rotation)
    A-->>C: new { accessToken, refreshToken }
```

## Salt vs pepper

| | Salt | Pepper |
|---|---|---|
| What | Random value per password | One server-wide secret (`PASSWORD_PEPPER` env) |
| Stored | Inside the hash string in the DB (argon2 embeds it automatically) | **Never** in the DB — env/secret manager only |
| Defeats | Rainbow tables; identical passwords → different hashes | Offline cracking of a stolen **DB dump**: without the pepper the hashes can't even be tested |

Implementation: `src/common/auth/password.util.ts` — argon2id with the pepper passed as argon2's `secret` option (HMAC-mixed, not string concatenation). ⚠️ Rotating the pepper invalidates every stored hash (all users must reset passwords).

## Why the access token has three "." parts and the refresh token doesn't

- The **access token is a JWT**: `base64url(header).base64url(payload).base64url(signature)` — three dot-separated segments. It's *stateless*: any server instance can verify the signature and read `{ sub, iat, exp }` without a DB hit. Decode the first two parts yourself — they're only encoded, **not encrypted** (never put secrets in a JWT payload). Trade-off: it can't be revoked, which is why it lives only 15 minutes.
- The **refresh token is deliberately NOT a JWT**: just 48 random bytes (base64url — no dots, no structure, no claims). It's *stateful*: the SHA-256 of it sits in the `RefreshToken` table, so it is **revocable** (logout, rotation, "log out everywhere") and single-use — refresh revokes the presented token and issues a new pair. Long-lived credentials must be revocable; that's the whole design.

Short version: three dots = self-contained signed document; no dots = opaque claim ticket the server looks up.

## Why `String @id @default(cuid())` for entity ids

| Option | Why not / why |
|---|---|
| `autoincrement()` Int | Leaks business volume (`/bookings/1042` ⇒ you have ~1042 bookings), enumerable by attackers, collides on future data merges. Used **only** for internal lookup tables (`Md*`, `Role`, `Permission`) where that's harmless and small ints make seeds/FKs cheap |
| `uuid()` v4 | Fully random → new rows land at random positions in the primary-key B-tree index, fragmenting it on write-heavy tables |
| **`cuid()`** ✓ | Collision-resistant, URL-safe, non-guessable, and **time-ordered** — new ids sort after old ones, so B-tree inserts append instead of fragmenting; `createdAt`-ish ordering for free |

## Date/time policy

All date math uses **`date-fns`** (+ `@date-fns/tz` for timezone-aware logic) — no hand-rolled `Date` arithmetic. Store UTC in PostgreSQL; interpret shop-local times (working hours, slots) in the shop timezone from `ShopSetting` (`shop.timezone`, default `Asia/Bangkok`). Rationale: immutable pure functions, tree-shakable, first-class TS — and avoids the classic DST/offset bugs of manual `getTime()` math.

# Artifact
<https://claude.ai/code/artifact/a262d0cc-c0d2-4a8d-bc6c-d7d9a23299f2?via=auto_preview>
