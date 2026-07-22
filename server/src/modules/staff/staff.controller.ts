import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { CreateTimeOffDto } from './dto/create-time-off.dto.js';
import { StaffPublicDto } from './dto/staff-public.dto.js';
import { StaffResponseDto, WorkingHoursResponseDto } from './dto/staff-response.dto.js';
import { TimeOffResponseDto } from './dto/time-off-response.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { ReplaceWorkingHoursDto } from './dto/upsert-working-hours.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: [StaffPublicDto] })
  findPublic(): Promise<StaffPublicDto[]> {
    return this.staffService.findPublic();
  }

  @Get('admin')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [StaffResponseDto] })
  findAdmin(): Promise<StaffResponseDto[]> {
    return this.staffService.findAdmin();
  }

  @Post()
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: StaffResponseDto })
  create(@Body() dto: CreateStaffDto): Promise<StaffResponseDto> {
    return this.staffService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: StaffResponseDto })
  findOne(@Param('id') id: string): Promise<StaffResponseDto> {
    return this.staffService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: StaffResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto): Promise<StaffResponseDto> {
    return this.staffService.update(id, dto);
  }

  @Put(':id/working-hours')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [WorkingHoursResponseDto] })
  replaceWorkingHours(@Param('id') id: string, @Body() dto: ReplaceWorkingHoursDto): Promise<WorkingHoursResponseDto[]> {
    return this.staffService.replaceWorkingHours(id, dto);
  }

  @Post(':id/time-off')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: TimeOffResponseDto })
  createTimeOff(@Param('id') id: string, @Body() dto: CreateTimeOffDto): Promise<TimeOffResponseDto> {
    return this.staffService.createStaffTimeOff(id, dto);
  }

  @Delete(':id/time-off/:timeOffId')
  @RequirePermissions('staff:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: TimeOffResponseDto })
  removeTimeOff(@Param('id') id: string, @Param('timeOffId') timeOffId: string): Promise<TimeOffResponseDto> {
    return this.staffService.removeStaffTimeOff(id, timeOffId);
  }
}
