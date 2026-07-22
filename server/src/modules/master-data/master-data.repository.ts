import { Injectable } from '@nestjs/common';
import { MdBookingStatus, MdPaymentStatus, MdPetSize } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MasterDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePetSizes(): Promise<MdPetSize[]> {
    return this.prisma.client.mdPetSize.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
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
