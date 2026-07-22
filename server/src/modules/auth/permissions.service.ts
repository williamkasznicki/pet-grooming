import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

type CacheEntry = { permissions: ReadonlySet<string>; expiresAt: number };

/**
 * Resolves a user's permission names via UserRole → RolePermission → Permission.
 * Permissions are never trusted from the JWT (see docs/RBAC.md) — resolved
 * server-side with a short in-memory cache to avoid a DB hit per request.
 */
@Injectable()
export class PermissionsService {
  private static readonly CACHE_TTL_MS = 60_000;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissions(userId: string): Promise<ReadonlySet<string>> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const userRoles = await this.prisma.client.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            rolePermissions: { select: { permission: { select: { name: true } } } },
          },
        },
      },
    });

    const permissions: ReadonlySet<string> = new Set(
      userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name)),
    );
    this.cache.set(userId, { permissions, expiresAt: Date.now() + PermissionsService.CACHE_TTL_MS });
    return permissions;
  }

  /** Call after changing a user's roles so new permissions apply immediately. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
