import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { Prisma, ServiceTier } from '../../generated/prisma/client.js';
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
    const services = await this.prisma.service.findMany({
      where: { deletedAt: null },
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return services.map((service) => this.toServiceResponse(service));
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.findExistingService(id);
    return this.toServiceResponse(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    try {
      const service = await this.prisma.service.create({
        data: {
          name: dto.name,
          description: dto.description,
          active: dto.active,
        },
        include: { tiers: true },
      });
      return this.toServiceResponse(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.prisma.service.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          active: dto.active,
        },
        include: { tiers: { orderBy: { sizeId: 'asc' } } },
      });
      return this.toServiceResponse(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async remove(id: string): Promise<ServiceResponseDto> {
    await this.ensureServiceExists(id);

    try {
      const service = await this.prisma.service.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
        include: { tiers: { orderBy: { sizeId: 'asc' } } },
      });
      return this.toServiceResponse(service);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async createTier(serviceId: string, dto: CreateServiceTierDto): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureActiveSize(dto.sizeId);

    try {
      const tier = await this.prisma.serviceTier.create({
        data: {
          serviceId,
          sizeId: dto.sizeId,
          priceThb: dto.priceThb,
          durationMin: dto.durationMin,
        },
      });
      return this.toTierResponse(tier);
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
      const tier = await this.prisma.serviceTier.update({
        where: { id: tierId },
        data: {
          sizeId: dto.sizeId,
          priceThb: dto.priceThb,
          durationMin: dto.durationMin,
        },
      });
      return this.toTierResponse(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async removeTier(serviceId: string, tierId: string): Promise<ServiceTierResponseDto> {
    await this.ensureServiceExists(serviceId);
    await this.ensureTierBelongsToService(serviceId, tierId);

    try {
      const tier = await this.prisma.serviceTier.delete({ where: { id: tierId } });
      return this.toTierResponse(tier);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async findExistingService(id: string): Promise<ServiceWithTiers> {
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
    });
    if (!service) {
      throw new NotFoundException('Service not found.');
    }
    return service;
  }

  private async ensureServiceExists(id: string): Promise<void> {
    const service = await this.prisma.service.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!service) {
      throw new NotFoundException('Service not found.');
    }
  }

  private async ensureTierBelongsToService(serviceId: string, tierId: string): Promise<void> {
    const tier = await this.prisma.serviceTier.findFirst({ where: { id: tierId, serviceId }, select: { id: true } });
    if (!tier) {
      throw new NotFoundException('Service tier not found.');
    }
  }

  private async ensureActiveSize(sizeId: number): Promise<void> {
    const size = await this.prisma.mdPetSize.findFirst({ where: { id: sizeId, isActive: true }, select: { id: true } });
    if (!size) {
      throw new BadRequestException('Pet size does not exist or is inactive.');
    }
  }

  private toServiceResponse(service: ServiceWithTiers): ServiceResponseDto {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      active: service.active,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      tiers: service.tiers.map((tier) => this.toTierResponse(tier)),
    };
  }

  private toTierResponse(tier: ServiceTier): ServiceTierResponseDto {
    return {
      id: tier.id,
      serviceId: tier.serviceId,
      sizeId: tier.sizeId,
      priceThb: tier.priceThb.toString(),
      durationMin: tier.durationMin,
    };
  }
}
