import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsRepository } from './bookings.repository.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [AvailabilityModule], // slot validity is proven by the same engine clients query
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
})
export class BookingsModule {}
