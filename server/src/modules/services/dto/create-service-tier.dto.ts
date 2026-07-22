import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';
import { ErrorMessages } from '../../../common/constants/error-messages.constant.js';

export class CreateServiceTierDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId!: number;

  // Non-negative decimal, max 2 places (THB) — IsNumberString would allow "-500"
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, { message: ErrorMessages.PRICE_INVALID })
  priceThb!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin!: number;
}
