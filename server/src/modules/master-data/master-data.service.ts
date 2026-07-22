import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async listPetSizes(): Promise<MasterDataResponseDto[]> {
    const sizes = await this.prisma.client.mdPetSize.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return sizes.map((size) => MasterDataResponseDto.from(size));
  }

  async listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.prisma.client.mdBookingStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

  async listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.prisma.client.mdPaymentStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return statuses.map((status) => MasterDataResponseDto.from(status));
  }

}
