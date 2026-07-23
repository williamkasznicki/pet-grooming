import { ApiProperty } from '@nestjs/swagger';
import { ShopOperatingSettings } from '../shop-operating-settings.js';

/**
 * Public, read-only projection of the ShopSetting rows that clients need to
 * explain booking rules (notice, cancellation window, hours). Values are
 * admin-editable at runtime — clients must render these, never hardcode.
 */
export class BookingRulesResponseDto {
  @ApiProperty({ example: 'Asia/Bangkok', description: 'IANA timezone the shop operates in' })
  timezone!: string;

  @ApiProperty({ example: 540, description: 'Shop opening, minutes from midnight shop-local' })
  openMin!: number;

  @ApiProperty({ example: 1080, description: 'Shop closing, minutes from midnight shop-local' })
  closeMin!: number;

  @ApiProperty({ example: 30, description: 'Slot grid step in minutes' })
  slotStepMin!: number;

  @ApiProperty({ example: 60, description: 'Minimum notice before a booking may start, in minutes' })
  minNoticeMin!: number;

  @ApiProperty({ example: 2, description: 'Hours before start until a client may cancel' })
  cancelCutoffHours!: number;

  static from(settings: ShopOperatingSettings): BookingRulesResponseDto {
    const dto = new BookingRulesResponseDto();
    dto.timezone = settings.timezone;
    dto.openMin = settings.openMin;
    dto.closeMin = settings.closeMin;
    dto.slotStepMin = settings.slotStepMin;
    dto.minNoticeMin = settings.minNoticeMin;
    dto.cancelCutoffHours = settings.cancelCutoffHours;
    return dto;
  }
}
