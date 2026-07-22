import { Prisma, ShopSetting } from '../../../generated/prisma/client.js';

export class ShopSettingResponseDto {
  key!: string;
  value!: Prisma.JsonValue;
  updatedAt!: string;

  static from(setting: ShopSetting): ShopSettingResponseDto {
    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
