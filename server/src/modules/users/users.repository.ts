import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type UserWithRoles = Prisma.UserGetPayload<{
  include: { userRoles: { include: { role: true } } };
}>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyWithRoles(): Promise<UserWithRoles[]> {
    return this.prisma.client.user.findMany({
      include: this.userRolesInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return this.prisma.client.user.findFirst({
      where: { id },
      include: this.userRolesInclude(),
    });
  }

  async userExists(id: string): Promise<boolean> {
    const user = await this.prisma.client.user.findFirst({ where: { id }, select: { id: true } });
    return user !== null;
  }

  async roleExists(roleId: number): Promise<boolean> {
    const role = await this.prisma.client.role.findFirst({ where: { id: roleId }, select: { id: true } });
    return role !== null;
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithRoles> {
    return this.prisma.client.user.update({
      where: { id },
      data,
      include: this.userRolesInclude(),
    });
  }

  softDelete(id: string): Promise<UserWithRoles> {
    return this.prisma.client.user.update({
      where: { id },
      data: { deletedAt: now() },
      include: this.userRolesInclude(),
    });
  }

  assignRole(userId: string, roleId: number): Promise<unknown> {
    return this.prisma.client.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }

  unassignRole(userId: string, roleId: number): Promise<unknown> {
    return this.prisma.client.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }

  private userRolesInclude() {
    return { userRoles: { include: { role: true }, orderBy: { role: { name: 'asc' as const } } } };
  }
}
