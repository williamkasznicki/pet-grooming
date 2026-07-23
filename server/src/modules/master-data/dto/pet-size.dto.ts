import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreatePetSizeDto {
  @ApiProperty({ maxLength: 20, example: 'S' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Band lower bound (kg), inclusive', example: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999)
  minWeightKg!: number;

  @ApiPropertyOptional({ description: 'Band upper bound (kg), exclusive; omit for open-ended', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(999)
  maxWeightKg?: number;

  @ApiPropertyOptional({ example: '#DCFCE7' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  hexBgColorCode?: string;

  @ApiPropertyOptional({ example: '#166534' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  hexTextColorCode?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  desc?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePetSizeDto extends PartialType(CreatePetSizeDto) {}
