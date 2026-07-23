import { ApiProperty } from '@nestjs/swagger';
import { MdBookingStatus, MdPaymentStatus, MdPetSize } from '../../../generated/prisma/client.js';

export type MasterDataRecord = MdPetSize | MdBookingStatus | MdPaymentStatus;

export class MasterDataResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'S' })
  code!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Weight band lower bound (kg) — pet sizes only', example: '0' })
  minWeightKg!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Upper bound (kg), null = open-ended — pet sizes only', example: '10' })
  maxWeightKg!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '#DCFCE7' })
  hexBgColorCode!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '#166534' })
  hexTextColorCode!: string | null;

  @ApiProperty({ type: String, nullable: true })
  desc!: string | null;

  @ApiProperty()
  isActive!: boolean;

  static from(record: MasterDataRecord): MasterDataResponseDto {
    const withWeights = 'minWeightKg' in record ? record : null;
    return {
      id: record.id,
      code: record.code,
      minWeightKg: withWeights?.minWeightKg?.toString() ?? null,
      maxWeightKg: withWeights?.maxWeightKg?.toString() ?? null,
      hexBgColorCode: record.hexBgColorCode,
      hexTextColorCode: record.hexTextColorCode,
      desc: record.desc,
      isActive: record.isActive,
    };
  }
}
