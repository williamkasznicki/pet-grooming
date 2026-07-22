import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';
import { ErrorMessages } from '../../../common/constants/error-messages.constant.js';

/** Staff price/duration override (booking:override) — see docs/DESIGN.md. */
export class OverrideBookingDto {
  @ApiPropertyOptional({ description: 'New price in THB', example: '650.00' })
  @IsOptional()
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, { message: ErrorMessages.PRICE_INVALID })
  priceThb?: string;

  @ApiPropertyOptional({ minimum: 1, example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin?: number;
}
