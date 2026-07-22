import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: { rolePermissions: { include: { permission: true } } };
}>;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyWithPermissions(): Promise<RoleWithPermissions[]> {
    return this.prisma.client.role.findMany({
      include: this.rolePermissionsInclude(),
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
  }

  findByIdWithPermissions(id: number): Promise<RoleWithPermissions | null> {
    return this.prisma.client.role.findFirst({
      where: { id },
      include: this.rolePermissionsInclude(),
    });
  }

  async roleExists(id: number): Promise<boolean> {
    const role = await this.prisma.client.role.findFirst({ where: { id }, select: { id: true } });
    return role !== null;
  }

  async permissionExists(permissionId: number): Promise<boolean> {
    const permission = await this.prisma.client.permission.findFirst({ where: { id: permissionId }, select: { id: true } });
    return permission !== null;
  }

  create(data: Prisma.RoleCreateInput): Promise<RoleWithPermissions> {
    return this.prisma.client.role.create({
      data,
      include: this.rolePermissionsInclude(),
    });
  }

  update(id: number, data: Prisma.RoleUpdateInput): Promise<RoleWithPermissions> {
    return this.prisma.client.role.update({
      where: { id },
      data,
      include: this.rolePermissionsInclude(),
    });
  }

  delete(id: number): Promise<unknown> {
    return this.prisma.client.role.delete({ where: { id } });
  }

  assignPermission(roleId: number, permissionId: number): Promise<unknown> {
    return this.prisma.client.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  unassignPermission(roleId: number, permissionId: number): Promise<unknown> {
    return this.prisma.client.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
  }

  private rolePermissionsInclude() {
    return { rolePermissions: { include: { permission: true }, orderBy: { permission: { name: 'asc' as const } } } };
  }
}
