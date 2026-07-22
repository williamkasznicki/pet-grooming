import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { CreateServiceTierDto } from './dto/create-service-tier.dto.js';
import { ServiceResponseDto, ServiceTierResponseDto } from './dto/service-response.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { UpdateServiceTierDto } from './dto/update-service-tier.dto.js';

type ServiceWithTiers = Prisma.ServiceGetPayload<{ include: { tiers: true } }>;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ServiceResponseDto[]> {
    const services = await this.prisma.client.service.findMany({
      // deletedAt: null is applied automatically (soft-delete filter in PrismaService)
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return services.map((service) => ServiceResponseDto.from(service));
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.findExistingService(id);
    return ServiceResponseDto.from(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    try {
      const service = await this.prisma.client.service.create({
        data: {
          name: dto.name,
          description: dto.description,
          active: dto.active,
        },
        include: { tiers: true },
      });
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.prisma.client.service.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          active: dto.active,
        },
        include: { tiers: { orderBy: { sizeId: 'asc' } } },
      });
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.prisma.client.service.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
        include: { tiers: { orderBy: { sizeId: 'asc' } } },
      });
      return ServiceResponseDto.from(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async createTier(serviceId: string, dto: CreateServiceTierDto): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureActiveSize(dto.sizeId);

    try {
      const tier = await this.prisma.client.serviceTier.create({
        data: {
          serviceId,
          sizeId: dto.sizeId,
          priceThb: dto.priceThb,
          durationMin: dto.durationMin,
        },
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
      const tier = await this.prisma.client.serviceTier.update({
        where: { id: tierId },
        data: {
          sizeId: dto.sizeId,
          priceThb: dto.priceThb,
          durationMin: dto.durationMin,
        },
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
      const tier = await this.prisma.client.serviceTier.delete({ where: { id: tierId } });
      return ServiceTierResponseDto.from(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async findExistingService(id: string): Promise<ServiceWithTiers> {
    const service = await this.prisma.client.service.findFirst({
      where: { id },
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
    });
    if (!service) {
      throw new NotFoundException(ErrorMessages.SERVICE_NOT_FOUND);
    }
    return service;
  }

  private async ensureServiceExists(id: string): Promise<void> {
    const service = await this.prisma.client.service.findFirst({ where: { id }, select: { id: true } });
    if (!service) {
      throw new NotFoundException(ErrorMessages.SERVICE_NOT_FOUND);
    }
  }

  private async ensureTierBelongsToService(serviceId: string, tierId: string): Promise<void> {
    const tier = await this.prisma.client.serviceTier.findFirst({ where: { id: tierId, serviceId }, select: { id: true } });
    if (!tier) {
      throw new NotFoundException(ErrorMessages.SERVICE_TIER_NOT_FOUND);
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    const size = await this.prisma.client.mdPetSize.findFirst({ where: { id: sizeId, isActive: true }, select: { id: true } });
    if (!size) {
      throw new BadRequestException(ErrorMessages.PET_SIZE_INVALID);
    }
  }

}
