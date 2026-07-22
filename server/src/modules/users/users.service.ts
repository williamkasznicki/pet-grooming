import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { PermissionsService } from '../auth/permissions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AssignUserRoleDto } from './dto/assign-user-role.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto, UserWithRoles } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.client.user.findMany({
      include: this.userRolesInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => UserResponseDto.from(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findExistingUser(id);
    return UserResponseDto.from(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
        },
        include: this.userRolesInclude(),
      });
      return UserResponseDto.from(user);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: this.userRolesInclude(),
      });
      return UserResponseDto.from(user);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async assignRole(id: string, dto: AssignUserRoleDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);
    await this.ensureRoleExists(dto.roleId);

    try {
      await this.prisma.client.userRole.create({
        data: {
          userId: id,
          roleId: dto.roleId,
        },
      });
      this.permissionsService.invalidate(id);
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async unassignRole(id: string, roleId: number): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      await this.prisma.client.userRole.delete({ where: { userId_roleId: { userId: id, roleId } } });
      this.permissionsService.invalidate(id);
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private userRolesInclude() {
    return { userRoles: { include: { role: true }, orderBy: { role: { name: 'asc' as const } } } };
  }

  private async findExistingUser(id: string): Promise<UserWithRoles> {
    const user = await this.prisma.client.user.findFirst({
      where: { id },
      include: this.userRolesInclude(),
    });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  private async ensureUserExists(id: string): Promise<void> {
    const user = await this.prisma.client.user.findFirst({ where: { id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
  }

  private async ensureRoleExists(roleId: number): Promise<void> {
    const role = await this.prisma.client.role.findFirst({ where: { id: roleId }, select: { id: true } });
    if (!role) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
  }
}
