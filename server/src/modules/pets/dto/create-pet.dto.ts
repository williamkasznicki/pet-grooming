import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ maxLength: 120, example: 'Mochi' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'Poodle' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  breed?: string;

  @ApiProperty({ description: 'Pet weight in kg — the size band is derived server-side', example: 7.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(999)
  weightKg!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
