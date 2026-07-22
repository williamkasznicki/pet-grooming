import { AuthUser } from '../types/auth.types.js';

/** Row-level owner scoping: {} = unrestricted (super admin), { ownerId } = own rows only. */
export type OwnerScope = { ownerId?: string };

/**
 * The ONE place row-level ownership scoping is decided (docs/RBAC.md):
 * "*" sees everything; everyone else is confined to rows they own.
 * Used by pets today, bookings next — never reimplement per module.
 */
export function ownerScope(user: AuthUser): OwnerScope {
  return user.permissions.has('*') ? {} : { ownerId: user.id };
}

/** Same rule for rows keyed by clientId (bookings). */
export type ClientScope = { clientId?: string };

export function clientScope(user: AuthUser): ClientScope {
  return user.permissions.has('*') ? {} : { clientId: user.id };
}
