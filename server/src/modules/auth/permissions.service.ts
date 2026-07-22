import { Injectable } from '@nestjs/common';
import { addMilliseconds, isAfter } from 'date-fns';
import { now } from '../../common/utils/clock.util.js';
import { AuthRepository } from './auth.repository.js';

type CacheEntry = { permissions: ReadonlySet<string>; expiresAt: Date };

/**
 * Resolves a user's permission names via UserRole → RolePermission → Permission.
 * Permissions are never trusted from the JWT (see docs/RBAC.md) — resolved
 * server-side with a short in-memory cache to avoid a DB hit per request.
 */
@Injectable()
export class PermissionsService {
  private static readonly CACHE_TTL_MS = 60_000;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly authRepository: AuthRepository) {}

  async getPermissions(userId: string): Promise<ReadonlySet<string>> {
    const cached = this.cache.get(userId);
    if (cached && isAfter(cached.expiresAt, now())) {
      return cached.permissions;
    }

    const permissions: ReadonlySet<string> = new Set(await this.authRepository.findUserPermissionNames(userId));
    this.cache.set(userId, { permissions, expiresAt: addMilliseconds(now(), PermissionsService.CACHE_TTL_MS) });
    return permissions;
  }

  /** Call after changing a user's roles so new permissions apply immediately. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /** Call after changing a ROLE's permissions (or deleting a role) — affects every user holding it. */
  invalidateAll(): void {
    this.cache.clear();
  }
}
