import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShopSetting } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/prisma/prisma-error.util.js';
import { ShopSettingResponseDto } from './dto/shop-setting-response.dto.js';
import { UpdateShopSettingDto } from './dto/update-shop-setting.dto.js';

@Injectable()
export class ShopSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ShopSettingResponseDto[]> {
    const settings = await this.prisma.shopSetting.findMany({ orderBy: { key: 'asc' } });
    return settings.map((setting) => ShopSettingResponseDto.from(setting));
  }

  async findOne(key: string): Promise<ShopSettingResponseDto> {
    const setting = await this.prisma.shopSetting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(ErrorMessages.SHOP_SETTING_NOT_FOUND);
    }
    return ShopSettingResponseDto.from(setting);
  }

  async upsert(key: string, dto: UpdateShopSettingDto): Promise<ShopSettingResponseDto> {
    const value = this.toJsonInput(dto.value);

    try {
      const setting = await this.prisma.shopSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      return ShopSettingResponseDto.from(setting);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    if (value === undefined) {
      throw new BadRequestException(ErrorMessages.SHOP_SETTING_VALUE_REQUIRED);
    }

    try {
      JSON.stringify(value);
    } catch {
      throw new BadRequestException(ErrorMessages.SHOP_SETTING_VALUE_INVALID);
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
