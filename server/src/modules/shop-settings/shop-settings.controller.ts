import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ShopSettingResponseDto } from './dto/shop-setting-response.dto.js';
import { UpdateShopSettingDto } from './dto/update-shop-setting.dto.js';
import { ShopSettingsService } from './shop-settings.service.js';

@ApiTags('shop-settings')
@Controller('shop-settings')
export class ShopSettingsController {
  constructor(private readonly shopSettingsService: ShopSettingsService) {}

  @Get()
  @ApiOkResponse({ type: [ShopSettingResponseDto] })
  findAll(): Promise<ShopSettingResponseDto[]> {
    return this.shopSettingsService.findAll();
  }

  @Get(':key')
  @ApiOkResponse({ type: ShopSettingResponseDto })
  findOne(@Param('key') key: string): Promise<ShopSettingResponseDto> {
    return this.shopSettingsService.findOne(key);
  }

  @Put(':key')
  @ApiOkResponse({ type: ShopSettingResponseDto, description: 'Upserted setting' })
  upsert(@Param('key') key: string, @Body() dto: UpdateShopSettingDto): Promise<ShopSettingResponseDto> {
    return this.shopSettingsService.upsert(key, dto);
  }
}
