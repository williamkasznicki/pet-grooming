import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { PermissionsService } from '../auth/permissions.service.js';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesRepository, RoleWithPermissions } from './roles.repository.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.findManyWithPermissions();
    return roles.map((role) => RoleResponseDto.from(role));
  }

  async findOne(id: number): Promise<RoleResponseDto> {
    const role = await this.findExistingRole(id);
    return RoleResponseDto.from(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    try {
      const role = await this.rolesRepository.create({
        name: dto.name,
        group: dto.group,
        desc: dto.desc,
      });
      return RoleResponseDto.from(role);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    await this.ensureRoleExists(id);

    try {
      const role = await this.rolesRepository.update(id, {
        name: dto.name,
        group: dto.group,
        desc: dto.desc,
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
      await this.rolesRepository.delete(id);
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
      await this.rolesRepository.assignPermission(id, dto.permissionId);
      this.permissionsService.invalidateAll(); // affects every user holding this role
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async unassignPermission(id: number, permissionId: number): Promise<RoleResponseDto> {
    await this.ensureRoleExists(id);

    try {
      await this.rolesRepository.unassignPermission(id, permissionId);
      this.permissionsService.invalidateAll(); // affects every user holding this role
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async findExistingRole(id: number): Promise<RoleWithPermissions> {
    const role = await this.rolesRepository.findByIdWithPermissions(id);
    if (!role) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
    return role;
  }

  private async ensureRoleExists(id: number): Promise<void> {
    if (!(await this.rolesRepository.roleExists(id))) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
  }

  private async ensurePermissionExists(permissionId: number): Promise<void> {
    if (!(await this.rolesRepository.permissionExists(permissionId))) {
      throw new NotFoundException(ErrorMessages.PERMISSION_NOT_FOUND);
    }
  }
}
