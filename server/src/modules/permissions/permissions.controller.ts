import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { PermissionResponseDto } from './dto/permission-response.dto.js';
import { PermissionsControllerService } from './permissions.service.js';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@RequirePermissions('user:manage')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsControllerService) {}

  @Get()
  @ApiOkResponse({ type: [PermissionResponseDto] })
  findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }
}
