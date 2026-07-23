import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { BookingRulesResponseDto } from './dto/booking-rules-response.dto.js';
import { ShopSettingResponseDto } from './dto/shop-setting-response.dto.js';
import { UpdateShopSettingDto } from './dto/update-shop-setting.dto.js';
import { parseOperatingSettings } from './shop-operating-settings.js';
import { ShopSettingsRepository } from './shop-settings.repository.js';

@Injectable()
export class ShopSettingsService {
  constructor(private readonly shopSettingsRepository: ShopSettingsRepository) {}

  async findAll(): Promise<ShopSettingResponseDto[]> {
    const settings = await this.shopSettingsRepository.findManyOrdered();
    return settings.map((setting) => ShopSettingResponseDto.from(setting));
  }

  /** Public booking-rule projection (see BookingRulesController). */
  async bookingRules(): Promise<BookingRulesResponseDto> {
    const rows = await this.shopSettingsRepository.findManyOrdered();
    return BookingRulesResponseDto.from(parseOperatingSettings(rows));
  }

  async findOne(key: string): Promise<ShopSettingResponseDto> {
    const setting = await this.shopSettingsRepository.findByKey(key);
    if (!setting) {
      throw new NotFoundException(ErrorMessages.SHOP_SETTING_NOT_FOUND);
    }
    return ShopSettingResponseDto.from(setting);
  }

  async upsert(key: string, dto: UpdateShopSettingDto): Promise<ShopSettingResponseDto> {
    const value = this.toJsonInput(dto.value);

    try {
      const setting = await this.shopSettingsRepository.upsertValue(key, value);
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
}
