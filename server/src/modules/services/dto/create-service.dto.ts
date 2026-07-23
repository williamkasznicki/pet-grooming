import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SERVICE_ICONS } from '../service-icons.constant.js';

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

  @ApiPropertyOptional({ maxLength: 120, example: 'อาบน้ำตัดขน', description: 'Thai display name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameTh?: string;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Thai description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descriptionTh?: string;

  @ApiPropertyOptional({ enum: SERVICE_ICONS, description: 'Preset icon key' })
  @IsOptional()
  @IsIn(SERVICE_ICONS)
  icon?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
