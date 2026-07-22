import { ApiProperty } from '@nestjs/swagger';
import { Prisma, ShopSetting } from '../../../generated/prisma/client.js';

export class ShopSettingResponseDto {
  @ApiProperty({ example: 'booking.cancelCutoffHours' })
  key!: string;

  @ApiProperty({ description: 'JSON value' })
  value!: Prisma.JsonValue;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static from(setting: ShopSetting): ShopSettingResponseDto {
    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
