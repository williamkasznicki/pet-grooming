import { MdBookingStatus, MdPaymentStatus, MdPetSize } from '../../../generated/prisma/client.js';

export type MasterDataRecord = MdPetSize | MdBookingStatus | MdPaymentStatus;

export class MasterDataResponseDto {
  id!: number;
  code!: string;
  hexBgColorCode!: string | null;
  hexTextColorCode!: string | null;
  desc!: string | null;
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
