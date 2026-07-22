import { ApiProperty } from '@nestjs/swagger';
import { MdBookingStatus, MdPaymentStatus, MdPetSize } from '../../../generated/prisma/client.js';

export type MasterDataRecord = MdPetSize | MdBookingStatus | MdPaymentStatus;

export class MasterDataResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'S' })
  code!: string;

  @ApiProperty({ type: String, nullable: true, example: '#DCFCE7' })
  hexBgColorCode!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '#166534' })
  hexTextColorCode!: string | null;

  @ApiProperty({ type: String, nullable: true })
  desc!: string | null;

  @ApiProperty()
  isActive!: boolean;

  static from(record: MasterDataRecord): MasterDataResponseDto {
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
