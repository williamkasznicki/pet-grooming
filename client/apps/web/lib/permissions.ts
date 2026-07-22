/**
 * Mirror of the backend permission names (docs/RBAC.md). Frontend checks are
 * UX only — NestJS guards are the enforcement point.
 */
export enum Permissions {
  CREATE_BOOKING = "booking:create",
  READ_BOOKING = "booking:read",
  UPDATE_BOOKING = "booking:update",
  CANCEL_BOOKING = "booking:cancel",
  DELETE_BOOKING = "booking:delete",
  OVERRIDE_BOOKING = "booking:override",
  CREATE_PET = "pet:create",
  READ_PET = "pet:read",
  UPDATE_PET = "pet:update",
  DELETE_PET = "pet:delete",
  MANAGE_SERVICES = "service:manage",
  MANAGE_STAFF = "staff:manage",
  MANAGE_SETTINGS = "settings:manage",
  MANAGE_USERS = "user:manage",
  READ_REPORTS = "report:read",
  SUPER_ADMIN = "*",
}

export function can(granted: readonly string[], permission: Permissions): boolean {
  return granted.includes(Permissions.SUPER_ADMIN) || granted.includes(permission)
}
