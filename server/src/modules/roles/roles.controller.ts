import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/auth.decorators.js';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { RoleResponseDto } from './dto/role-response.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@RequirePermissions('user:manage')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOkResponse({ type: [RoleResponseDto] })
  findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: RoleResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: RoleResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: RoleResponseDto })
  remove(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @ApiCreatedResponse({ type: RoleResponseDto })
  assignPermission(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRolePermissionDto): Promise<RoleResponseDto> {
    return this.rolesService.assignPermission(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @ApiOkResponse({ type: RoleResponseDto })
  unassignPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<RoleResponseDto> {
    return this.rolesService.unassignPermission(id, permissionId);
  }
}
