import { Module } from '@nestjs/common';
import { ShopSettingsController } from './shop-settings.controller.js';
import { ShopSettingsRepository } from './shop-settings.repository.js';
import { ShopSettingsService } from './shop-settings.service.js';

@Module({
  controllers: [ShopSettingsController],
  providers: [ShopSettingsService, ShopSettingsRepository],
})
export class ShopSettingsModule {}
