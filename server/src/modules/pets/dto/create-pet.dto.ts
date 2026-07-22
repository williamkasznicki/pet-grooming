import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ description: 'Owner user id (temporary until auth provides it)', example: 'cmrw5wcsp00000kga6eicbozq' })
  @IsString()
  @MaxLength(191)
  ownerId!: string;

  @ApiProperty({ maxLength: 120, example: 'Mochi' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'Poodle' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  breed?: string;

  @ApiProperty({ description: 'MdPetSize id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId!: number;

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
