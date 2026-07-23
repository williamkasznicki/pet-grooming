import { Module } from '@nestjs/common';
import { BookingRulesController } from './booking-rules.controller.js';
import { ShopSettingsController } from './shop-settings.controller.js';
import { ShopSettingsRepository } from './shop-settings.repository.js';
import { ShopSettingsService } from './shop-settings.service.js';

@Module({
  controllers: [ShopSettingsController, BookingRulesController],
  providers: [ShopSettingsService, ShopSettingsRepository],
  exports: [ShopSettingsService],
})
export class ShopSettingsModule {}
