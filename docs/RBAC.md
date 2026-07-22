# RBAC — Roles & Permissions

Table-driven RBAC. No role/permission enums in the database — everything is data, seeded and admin-editable.

## Model

```
User ──< UserRole >── Role ──< RolePermission >── Permission
```

| Table | Columns |
|---|---|
| `Role` | `id`, `name` (unique), `group`, `desc` |
| `Permission` | `id`, `name` (unique), `displayName`, `group`, `desc` |
| `RolePermission` | `roleId` + `permissionId` (composite PK) |
| `UserRole` | `userId` + `roleId` (composite PK) |

## Permission naming convention

`resource:action`, lowercase. The wildcard `*` grants everything (super admin).

| name | displayName | group |
|---|---|---|
| `booking:create` | Create Booking | Booking |
| `booking:read` | Read Booking | Booking |
| `booking:update` | Update Booking | Booking |
| `booking:cancel` | Cancel Booking | Booking |
| `booking:delete` | Delete Booking | Booking |
| `booking:override` | Override Price/Duration | Booking |
| `pet:create` / `pet:read` / `pet:update` / `pet:delete` | … | Pet |
| `service:manage` | Manage Services & Tiers | Service |
| `staff:manage` | Manage Staff & Schedules | Staff |
| `settings:manage` | Manage Shop Settings | Settings |
| `user:manage` | Manage Users & Roles | Admin |
| `report:read` | View Reports | Admin |
| `*` | Super Admin | Admin |

Seeded roles:

| Role | group | permissions |
|---|---|---|
| Admin | Admin | `*` |
| Groomer | Staff | `booking:read`, `booking:update`, `booking:cancel`, `booking:override`, `pet:read` |
| Client | Client | `booking:create`, `booking:read`, `booking:cancel`, `pet:create`, `pet:read`, `pet:update` |

Note: `booking:read`-type permissions are coarse gates. Row-level scoping (a client sees only *their own* bookings, a groomer only their assigned ones) is enforced in services, not by RBAC.

## Backend usage (NestJS)

- JWT payload carries `sub` (user id) only; permissions are resolved server-side (and cached) — never trusted from the token.
- `PermissionsGuard` + decorator:

```ts
@RequirePermissions('booking:cancel')
@Post(':id/cancel')
cancel(@Param('id') id: string) { ... }
```

- The guard passes if the user's permission set contains the required name **or** `*`.

## Frontend usage (Next.js)

Mirror the permission names in a TS enum so checks are typo-safe:

```ts
export enum Permissions {
  CREATE_BOOKING = 'booking:create',
  READ_BOOKING = 'booking:read',
  UPDATE_BOOKING = 'booking:update',
  CANCEL_BOOKING = 'booking:cancel',
  DELETE_BOOKING = 'booking:delete',
  OVERRIDE_BOOKING = 'booking:override',
  MANAGE_SERVICES = 'service:manage',
  MANAGE_STAFF = 'staff:manage',
  MANAGE_SETTINGS = 'settings:manage',
  MANAGE_USERS = 'user:manage',
  READ_REPORTS = 'report:read',
  SUPER_ADMIN = '*',
}
```

The API exposes the current user's permission names (e.g. on `GET /auth/me`); the client stores them once and checks locally:

```ts
// service / hook
authService.can(Permissions.CREATE_BOOKING)
// or
const { can } = usePermissions();
if (can(Permissions.MANAGE_STAFF)) { /* show admin nav */ }
```

`can()` returns true when the set includes the name or `*`. Frontend checks are UX only — the server guard is the enforcement point.

## Adding a permission

1. Add a row in the seed (`prisma/seed.ts`) following `resource:action`.
2. Attach it to roles via `RolePermission` in the seed.
3. Add the member to the frontend `Permissions` enum.
4. Guard the endpoint with `@RequirePermissions(...)`.
