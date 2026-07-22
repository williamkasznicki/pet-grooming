import { Request } from 'express';

/** Attached to the request by JwtAuthGuard. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  /** Resolved permission names, e.g. "booking:create"; may contain "*". */
  permissions: ReadonlySet<string>;
};

export type AuthenticatedRequest = Request & { user: AuthUser };

export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.has('*') || user.permissions.has(permission);
}
