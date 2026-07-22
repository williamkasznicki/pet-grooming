import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { AssignUserRoleDto } from './dto/assign-user-role.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@RequirePermissions('user:manage')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [UserResponseDto] })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOkResponse({ type: UserResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: UserResponseDto, description: 'Soft-deleted user' })
  remove(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.remove(id);
  }

  @Post(':id/roles')
  @ApiCreatedResponse({ type: UserResponseDto })
  assignRole(@Param('id') id: string, @Body() dto: AssignUserRoleDto): Promise<UserResponseDto> {
    return this.usersService.assignRole(id, dto);
  }

  @Delete(':id/roles/:roleId')
  @ApiOkResponse({ type: UserResponseDto })
  unassignRole(@Param('id') id: string, @Param('roleId', ParseIntPipe) roleId: number): Promise<UserResponseDto> {
    return this.usersService.unassignRole(id, roleId);
  }
}
