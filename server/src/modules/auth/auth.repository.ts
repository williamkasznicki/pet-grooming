import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { Prisma, RefreshToken, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type AuthUserRecord = Pick<User, 'id' | 'email' | 'name'>;
export type RefreshTokenWithUser = Pick<RefreshToken, 'id' | 'revokedAt' | 'expiresAt'> & { user: AuthUserRecord };

/** All identity/token data access for the auth module (see pets.repository.ts for the pattern). */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createUserWithRole(data: Prisma.UserCreateWithoutUserRolesInput, roleName: string): Promise<AuthUserRecord> {
    return this.prisma.client.user.create({
      data: { ...data, userRoles: { create: { role: { connect: { name: roleName } } } } },
      select: { id: true, email: true, name: true },
    });
  }

  findUserByEmailWithHash(email: string): Promise<(AuthUserRecord & { passwordHash: string }) | null> {
    return this.prisma.client.user.findFirst({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
  }

  findUserById(id: string): Promise<AuthUserRecord | null> {
    return this.prisma.client.user.findFirst({ where: { id }, select: { id: true, email: true, name: true } });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    return this.prisma.client.refreshToken.create({ data: { userId, tokenHash, expiresAt } }).then(() => undefined);
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    return this.prisma.client.refreshToken.findFirst({
      where: { tokenHash },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async revokeRefreshTokenById(id: string): Promise<void> {
    await this.prisma.client.refreshToken.update({ where: { id }, data: { revokedAt: now() } });
  }

  /** Idempotent: revoking an unknown/already-revoked token is a no-op. */
  async revokeActiveRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now() },
    });
  }

  async findUserRoleNames(userId: string): Promise<string[]> {
    const rows = await this.prisma.client.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    return rows.map((row) => row.role.name);
  }

  async findUserPermissionNames(userId: string): Promise<string[]> {
    const rows = await this.prisma.client.userRole.findMany({
      where: { userId },
      select: {
        role: { select: { rolePermissions: { select: { permission: { select: { name: true } } } } } },
      },
    });
    return rows.flatMap((row) => row.role.rolePermissions.map((rp) => rp.permission.name));
  }
}
