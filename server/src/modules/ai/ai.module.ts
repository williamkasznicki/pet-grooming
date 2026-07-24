import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module.js';
import { PetsModule } from '../pets/pets.module.js';
import { ServicesModule } from '../services/services.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { AiController } from './ai.controller.js';
import { AiRepository } from './ai.repository.js';
import { AiService } from './ai.service.js';

/** Booking assistant. Reads the deterministic services; never writes bookings. */
@Module({
  imports: [ServicesModule, AvailabilityModule, ShopSettingsModule, PetsModule],
  controllers: [AiController],
  providers: [AiService, AiRepository],
})
export class AiModule {}
