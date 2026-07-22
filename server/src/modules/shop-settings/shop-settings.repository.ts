import { Injectable } from '@nestjs/common';
import { Prisma, ShopSetting } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ShopSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyOrdered(): Promise<ShopSetting[]> {
    return this.prisma.client.shopSetting.findMany({ orderBy: { key: 'asc' } });
  }

  findByKey(key: string): Promise<ShopSetting | null> {
    return this.prisma.client.shopSetting.findUnique({ where: { key } });
  }

  upsertValue(key: string, value: Prisma.InputJsonValue): Promise<ShopSetting> {
    return this.prisma.client.shopSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
