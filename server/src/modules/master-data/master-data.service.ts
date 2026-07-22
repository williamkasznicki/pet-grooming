import { Injectable } from '@nestjs/common';
import { MdBookingStatus, MdPaymentStatus, MdPetSize } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MasterDataResponseDto } from './dto/master-data-response.dto.js';

type MasterDataRecord = MdPetSize | MdBookingStatus | MdPaymentStatus;

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async listPetSizes(): Promise<MasterDataResponseDto[]> {
    const sizes = await this.prisma.mdPetSize.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return sizes.map((size) => this.toResponse(size));
  }

  async listBookingStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.prisma.mdBookingStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return statuses.map((status) => this.toResponse(status));
  }

  async listPaymentStatuses(): Promise<MasterDataResponseDto[]> {
    const statuses = await this.prisma.mdPaymentStatus.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return statuses.map((status) => this.toResponse(status));
  }

  private toResponse(record: MasterDataRecord): MasterDataResponseDto {
    return {
      id: record.id,
      code: record.code,
      hexBgColorCode: record.hexBgColorCode,
      hexTextColorCode: record.hexTextColorCode,
      desc: record.desc,
      isActive: record.isActive,
    };
  }
}
