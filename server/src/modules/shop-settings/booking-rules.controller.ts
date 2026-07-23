import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators.js';
import { BookingRulesResponseDto } from './dto/booking-rules-response.dto.js';
import { ShopSettingsService } from './shop-settings.service.js';

/**
 * Public counterpart to the admin-only /shop-settings controller: exposes just
 * the booking rules clients need to explain scheduling (notice, cutoff, hours)
 * without leaking the rest of the settings table.
 */
@ApiTags('booking-rules')
@Controller('booking-rules')
export class BookingRulesController {
  constructor(private readonly shopSettingsService: ShopSettingsService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: BookingRulesResponseDto })
  find(): Promise<BookingRulesResponseDto> {
    return this.shopSettingsService.bookingRules();
  }
}
