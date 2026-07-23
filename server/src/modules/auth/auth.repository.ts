import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { Prisma, RefreshToken, User, VerificationCode } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type AuthUserRecord = Pick<User, 'id' | 'email' | 'name'>;
export type RefreshTokenWithUser = Pick<RefreshToken, 'id' | 'revokedAt' | 'expiresAt'> & { user: AuthUserRecord };
export type VerificationCodeWithUser = VerificationCode & { user: AuthUserRecord };

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

  findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.client.user.findFirst({ where: { email }, select: { id: true, email: true, name: true } });
  }

  /** Fresh code: any unconsumed codes of the same purpose are dropped first. */
  async createVerificationCode(userId: string, purpose: string, codeHash: string, expiresAt: Date): Promise<string> {
    await this.prisma.client.verificationCode.deleteMany({ where: { userId, purpose, consumedAt: null } });
    const row = await this.prisma.client.verificationCode.create({
      data: { userId, purpose, codeHash, expiresAt },
      select: { id: true },
    });
    return row.id;
  }

  findVerificationCode(id: string): Promise<VerificationCodeWithUser | null> {
    return this.prisma.client.verificationCode.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  /** Newest code for a user + purpose — reset flow looks it up by email, not challenge id. */
  findNewestVerificationCode(userId: string, purpose: string): Promise<VerificationCodeWithUser | null> {
    return this.prisma.client.verificationCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async incrementVerificationAttempts(id: string): Promise<void> {
    await this.prisma.client.verificationCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async consumeVerificationCode(id: string): Promise<void> {
    await this.prisma.client.verificationCode.update({ where: { id }, data: { consumedAt: now() } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.client.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now() },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.client.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /** Password reset invalidates every session (all refresh tokens revoked). */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
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
