import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { CreateServiceTierDto } from './dto/create-service-tier.dto.js';
import { ServiceResponseDto, ServiceTierResponseDto } from './dto/service-response.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { UpdateServiceTierDto } from './dto/update-service-tier.dto.js';
import { ServicesService } from './services.service.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(): Promise<ServiceResponseDto[]> {
    return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.servicesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.servicesService.remove(id);
  }

  @Post(':serviceId/tiers')
  createTier(@Param('serviceId') serviceId: string, @Body() dto: CreateServiceTierDto): Promise<ServiceTierResponseDto> {
    return this.servicesService.createTier(serviceId, dto);
  }

  @Put(':serviceId/tiers/:tierId')
  updateTier(
    @Param('serviceId') serviceId: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateServiceTierDto,
  ): Promise<ServiceTierResponseDto> {
    return this.servicesService.updateTier(serviceId, tierId, dto);
  }

  @Delete(':serviceId/tiers/:tierId')
  removeTier(@Param('serviceId') serviceId: string, @Param('tierId') tierId: string): Promise<ServiceTierResponseDto> {
    return this.servicesService.removeTier(serviceId, tierId);
  }
}
