import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';
import { ErrorMessages } from '../../../common/constants/error-messages.constant.js';

export class CreateServiceTierDto {
  @ApiProperty({ description: 'MdPetSize id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId!: number;

  // Non-negative decimal, max 2 places (THB) — IsNumberString would allow "-500"
  @ApiProperty({ description: 'Price in THB, non-negative, max 2 decimals', example: '590.00' })
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, { message: ErrorMessages.PRICE_INVALID })
  priceThb!: string;

  @ApiProperty({ minimum: 1, example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin!: number;
}
