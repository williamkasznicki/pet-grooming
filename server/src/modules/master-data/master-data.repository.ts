import { Injectable } from '@nestjs/common';
import { MdBookingStatus, MdPaymentStatus, MdPetSize, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MasterDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePetSizes(): Promise<MdPetSize[]> {
    return this.prisma.client.mdPetSize.findMany({
      where: { isActive: true },
      orderBy: { minWeightKg: 'asc' },
    });
  }

  findAllPetSizes(): Promise<MdPetSize[]> {
    return this.prisma.client.mdPetSize.findMany({ orderBy: { minWeightKg: 'asc' } });
  }

  async petSizeExists(id: number): Promise<boolean> {
    const size = await this.prisma.client.mdPetSize.findFirst({ where: { id }, select: { id: true } });
    return size !== null;
  }

  createPetSize(data: Prisma.MdPetSizeCreateInput): Promise<MdPetSize> {
    return this.prisma.client.mdPetSize.create({ data });
  }

  updatePetSize(id: number, data: Prisma.MdPetSizeUpdateInput): Promise<MdPetSize> {
    return this.prisma.client.mdPetSize.update({ where: { id }, data });
  }

  /** Hard delete — throws P2003 when pets/tiers reference the band (service translates). */
  deletePetSize(id: number): Promise<MdPetSize> {
    return this.prisma.client.mdPetSize.delete({ where: { id } });
  }

  findActiveBookingStatuses(): Promise<MdBookingStatus[]> {
    return this.prisma.client.mdBookingStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }

  findActivePaymentStatuses(): Promise<MdPaymentStatus[]> {
    return this.prisma.client.mdPaymentStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }
}
