import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../../common/auth/auth.decorators.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { CreateServiceTierDto } from './dto/create-service-tier.dto.js';
import { ServiceResponseDto, ServiceTierResponseDto } from './dto/service-response.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { UpdateServiceTierDto } from './dto/update-service-tier.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public() // clients browse services before logging in
  @Get()
  @ApiOkResponse({ type: [ServiceResponseDto] })
  findAll(): Promise<ServiceResponseDto[]> {
    return this.servicesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: ServiceResponseDto })
  findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.servicesService.findOne(id);
  }

  @Post()
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ServiceResponseDto })
  create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ServiceResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ServiceResponseDto, description: 'Soft-deleted service' })
  remove(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.servicesService.remove(id);
  }

  @Post(':serviceId/tiers')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ServiceTierResponseDto })
  createTier(@Param('serviceId') serviceId: string, @Body() dto: CreateServiceTierDto): Promise<ServiceTierResponseDto> {
    return this.servicesService.createTier(serviceId, dto);
  }

  @Put(':serviceId/tiers/:tierId')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ServiceTierResponseDto })
  updateTier(
    @Param('serviceId') serviceId: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateServiceTierDto,
  ): Promise<ServiceTierResponseDto> {
    return this.servicesService.updateTier(serviceId, tierId, dto);
  }

  @Delete(':serviceId/tiers/:tierId')
  @RequirePermissions('service:manage')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ServiceTierResponseDto })
  removeTier(@Param('serviceId') serviceId: string, @Param('tierId') tierId: string): Promise<ServiceTierResponseDto> {
    return this.servicesService.removeTier(serviceId, tierId);
  }
}
