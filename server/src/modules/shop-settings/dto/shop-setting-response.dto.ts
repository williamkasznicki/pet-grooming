import { Prisma } from '../../../generated/prisma/client.js';

export type ShopSettingResponseDto = {
  key: string;
  value: Prisma.JsonValue;
  updatedAt: string;
};
