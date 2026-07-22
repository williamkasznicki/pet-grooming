import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class UpdateShopSettingDto {
  @ApiProperty({ description: 'Arbitrary JSON value for this setting key', example: { openMin: 540, closeMin: 1080 } })
  @Allow()
  value!: unknown;
}
