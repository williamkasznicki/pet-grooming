import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { Prisma, ServiceTier } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type ServiceWithTiers = Prisma.ServiceGetPayload<{ include: { tiers: true } }>;

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyWithTiers(): Promise<ServiceWithTiers[]> {
    return this.prisma.client.service.findMany({
      // deletedAt: null is applied automatically (soft-delete filter in PrismaService)
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdWithTiers(id: string): Promise<ServiceWithTiers | null> {
    return this.prisma.client.service.findFirst({
      where: { id },
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
    });
  }

  async serviceExists(id: string): Promise<boolean> {
    const service = await this.prisma.client.service.findFirst({ where: { id }, select: { id: true } });
    return service !== null;
  }

  create(data: Prisma.ServiceCreateInput): Promise<ServiceWithTiers> {
    return this.prisma.client.service.create({
      data,
      include: { tiers: true },
    });
  }

  update(id: string, data: Prisma.ServiceUpdateInput): Promise<ServiceWithTiers> {
    return this.prisma.client.service.update({
      where: { id },
      data,
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
    });
  }

  softDelete(id: string): Promise<ServiceWithTiers> {
    return this.prisma.client.service.update({
      where: { id },
      data: { deletedAt: now(), active: false },
      include: { tiers: { orderBy: { sizeId: 'asc' } } },
    });
  }

  createTier(data: Prisma.ServiceTierUncheckedCreateInput): Promise<ServiceTier> {
    return this.prisma.client.serviceTier.create({ data });
  }

  updateTier(id: string, data: Prisma.ServiceTierUncheckedUpdateInput): Promise<ServiceTier> {
    return this.prisma.client.serviceTier.update({ where: { id }, data });
  }

  deleteTier(id: string): Promise<ServiceTier> {
    return this.prisma.client.serviceTier.delete({ where: { id } });
  }

  async tierBelongsToService(serviceId: string, tierId: string): Promise<boolean> {
    const tier = await this.prisma.client.serviceTier.findFirst({ where: { id: tierId, serviceId }, select: { id: true } });
    return tier !== null;
  }

  async activeSizeExists(sizeId: number): Promise<boolean> {
    const size = await this.prisma.client.mdPetSize.findFirst({ where: { id: sizeId, isActive: true }, select: { id: true } });
    return size !== null;
  }
}
