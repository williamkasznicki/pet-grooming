import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShopSetting } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { ShopSettingResponseDto } from './dto/shop-setting-response.dto.js';
import { UpdateShopSettingDto } from './dto/update-shop-setting.dto.js';

@Injectable()
export class ShopSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ShopSettingResponseDto[]> {
    const settings = await this.prisma.shopSetting.findMany({ orderBy: { key: 'asc' } });
    return settings.map((setting) => this.toResponse(setting));
  }

  async findOne(key: string): Promise<ShopSettingResponseDto> {
    const setting = await this.prisma.shopSetting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException('Shop setting not found.');
    }
    return this.toResponse(setting);
  }

  async upsert(key: string, dto: UpdateShopSettingDto): Promise<ShopSettingResponseDto> {
    const value = this.toJsonInput(dto.value);

    try {
      const setting = await this.prisma.shopSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      return this.toResponse(setting);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    if (value === undefined) {
      throw new BadRequestException('Setting value is required.');
    }

    try {
      JSON.stringify(value);
    } catch {
      throw new BadRequestException('Setting value must be valid JSON.');
    }

    return value as Prisma.InputJsonValue;
  }

  private toResponse(setting: ShopSetting): ShopSettingResponseDto {
    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
