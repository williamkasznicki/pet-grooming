import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { PermissionsService } from '../auth/permissions.service.js';
import { AssignUserRoleDto } from './dto/assign-user-role.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersRepository, UserWithRoles } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.findManyWithRoles();
    return users.map((user) => UserResponseDto.from(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findExistingUser(id);
    return UserResponseDto.from(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      const user = await this.usersRepository.update(id, {
        name: dto.name,
        phone: dto.phone,
      });
      return UserResponseDto.from(user);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      const user = await this.usersRepository.softDelete(id);
      return UserResponseDto.from(user);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async assignRole(id: string, dto: AssignUserRoleDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);
    await this.ensureRoleExists(dto.roleId);

    try {
      await this.usersRepository.assignRole(id, dto.roleId);
      this.permissionsService.invalidate(id);
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async unassignRole(id: string, roleId: number): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

    try {
      await this.usersRepository.unassignRole(id, roleId);
      this.permissionsService.invalidate(id);
      return this.findOne(id);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async findExistingUser(id: string): Promise<UserWithRoles> {
    const user = await this.usersRepository.findByIdWithRoles(id);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return user;
  }

  private async ensureUserExists(id: string): Promise<void> {
    if (!(await this.usersRepository.userExists(id))) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
  }

  private async ensureRoleExists(roleId: number): Promise<void> {
    if (!(await this.usersRepository.roleExists(roleId))) {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
  }
}
