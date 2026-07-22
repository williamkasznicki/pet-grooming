import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { CreateTimeOffDto } from './dto/create-time-off.dto.js';
import { TimeOffResponseDto } from './dto/time-off-response.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('time-off')
@ApiBearerAuth()
@Controller('time-off')
@RequirePermissions('staff:manage')
export class ShopTimeOffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOkResponse({ type: [TimeOffResponseDto] })
  findAll(): Promise<TimeOffResponseDto[]> {
    return this.staffService.findShopTimeOff();
  }

  @Post()
  @ApiCreatedResponse({ type: TimeOffResponseDto })
  create(@Body() dto: CreateTimeOffDto): Promise<TimeOffResponseDto> {
    return this.staffService.createShopTimeOff(dto);
  }

  @Delete(':timeOffId')
  @ApiOkResponse({ type: TimeOffResponseDto })
  remove(@Param('timeOffId') timeOffId: string): Promise<TimeOffResponseDto> {
    return this.staffService.removeShopTimeOff(timeOffId);
  }
}
