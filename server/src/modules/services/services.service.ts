import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { CreateServiceTierDto } from './dto/create-service-tier.dto.js';
import { ServiceResponseDto, ServiceTierResponseDto } from './dto/service-response.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { UpdateServiceTierDto } from './dto/update-service-tier.dto.js';
import { ServiceWithTiers, ServicesRepository } from './services.repository.js';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async findAll(): Promise<ServiceResponseDto[]> {
    const services = await this.servicesRepository.findManyWithTiers();
    return services.map((service) => ServiceResponseDto.from(service));
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.findExistingService(id);
    return ServiceResponseDto.from(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    try {
      const service = await this.servicesRepository.create({
        name: dto.name,
        description: dto.description,
        nameTh: dto.nameTh,
        descriptionTh: dto.descriptionTh,
        active: dto.active,
      });
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.servicesRepository.update(id, {
        name: dto.name,
        description: dto.description,
        nameTh: dto.nameTh,
        descriptionTh: dto.descriptionTh,
        active: dto.active,
      });
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.servicesRepository.softDelete(id);
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async createTier(serviceId: string, dto: CreateServiceTierDto): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureActiveSize(dto.sizeId);

    try {
      const tier = await this.servicesRepository.createTier({
        serviceId,
        sizeId: dto.sizeId,
        priceThb: dto.priceThb,
        durationMin: dto.durationMin,
      });
      return ServiceTierResponseDto.from(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async updateTier(serviceId: string, tierId: string, dto: UpdateServiceTierDto): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureTierBelongsToService(serviceId, tierId);
    if (dto.sizeId !== undefined) {
      await this.ensureActiveSize(dto.sizeId);
    }

    try {
      const tier = await this.servicesRepository.updateTier(tierId, {
        sizeId: dto.sizeId,
        priceThb: dto.priceThb,
        durationMin: dto.durationMin,
      });
      return ServiceTierResponseDto.from(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async removeTier(serviceId: string, tierId: string): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureTierBelongsToService(serviceId, tierId);

    try {
      const tier = await this.servicesRepository.deleteTier(tierId);
      return ServiceTierResponseDto.from(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async findExistingService(id: string): Promise<ServiceWithTiers> {
    const service = await this.servicesRepository.findByIdWithTiers(id);
    if (!service) {
      throw new NotFoundException(ErrorMessages.SERVICE_NOT_FOUND);
    }
    return service;
  }

  private async ensureServiceExists(id: string): Promise<void> {
    if (!(await this.servicesRepository.serviceExists(id))) {
      throw new NotFoundException(ErrorMessages.SERVICE_NOT_FOUND);
    }
  }

  private async ensureTierBelongsToService(serviceId: string, tierId: string): Promise<void> {
    if (!(await this.servicesRepository.tierBelongsToService(serviceId, tierId))) {
      throw new NotFoundException(ErrorMessages.SERVICE_TIER_NOT_FOUND);
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    if (!(await this.servicesRepository.activeSizeExists(sizeId))) {
      throw new BadRequestException(ErrorMessages.PET_SIZE_INVALID);
    }
  }

}
