import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ maxLength: 120, example: 'Full Groom' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Bath, cut, nails' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
