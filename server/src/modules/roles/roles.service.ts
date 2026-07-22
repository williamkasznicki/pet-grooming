import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PermissionsService } from '../auth/permissions.service.js';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleResponseDto, RoleWithPermissions } from './dto/role-response.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.client.role.findMany({
      include: this.rolePermissionsInclude(),
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    return roles.map((role) => RoleResponseDto.from(role));
  }

  async findOne(id: number): Promise<RoleResponseDto> {
    const role = await this.findExistingRole(id);
    return RoleResponseDto.from(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    try {
      const role = await this.prisma.client.role.create({
        data: {
          name: dto.name,
          group: dto.group,
          desc: dto.desc,
        },
        include: this.rolePermissionsInclude(),
      });
      return RoleResponseDto.from(role);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    await this.ensureRoleExists(id);

    try {
      const role = await this.prisma.client.role.update({
        where: { id },
        data: {
          name: dto.name,
          group: dto.group,
          desc: dto.desc,
        },
        include: this.rolePermissionsInclude(),
      });
      return RoleResponseDto.from(role);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: number): Promise<RoleResponseDto> {
    const existingRole = await this.findExistingRole(id);

    try {
      // UserRole and RolePermission rows cascade from the Prisma schema relations.
      await this.prisma.client.role.delete({ where: { id } });
      this.permissionsService.invalidateAll(); // every user holding this role loses its permissions
      return RoleResponseDto.from(existingRole);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async assignPermission(id: number, dto: AssignRolePermissionDto): Promise<RoleResponseDto> {
    await this.ensureRoleExists(id);
    await this.ensurePermissionExists(dto.permissionId);

    try {
      await this.prisma.client.rolePermission.create({
        data: {
          roleId: id,
          permissionId: dto.permissionId,
        },
      });
      this.permissionsService.invalidateAll(); // affects every user holding this role
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async unassignPermission(id: number, permissionId: number): Promise<RoleResponseDto> {
    await this.ensureRoleExists(id);

    try {
      await this.prisma.client.rolePermission.delete({ where: { roleId_permissionId: { roleId: id, permissionId } } });
      this.permissionsService.invalidateAll(); // affects every user holding this role
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private rolePermissionsInclude() {
    return { rolePermissions: { include: { permission: true }, orderBy: { permission: { name: 'asc' as const } } } };
  }

  private async findExistingRole(id: number): Promise<RoleWithPermissions> {
    const role = await this.prisma.client.role.findFirst({
      where: { id },
      include: this.rolePermissionsInclude(),
    });
    if (!role) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
    return role;
  }

  private async ensureRoleExists(id: number): Promise<void> {
    const role = await this.prisma.client.role.findFirst({ where: { id }, select: { id: true } });
    if (!role) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
  }

  private async ensurePermissionExists(permissionId: number): Promise<void> {
    const permission = await this.prisma.client.permission.findFirst({ where: { id: permissionId }, select: { id: true } });
    if (!permission) {
      throw new NotFoundException(ErrorMessages.PERMISSION_NOT_FOUND);
    }
  }
}
