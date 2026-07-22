import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ErrorMessages } from '../../../common/constants/error-messages.constant.js';

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'MdPetSize id (determines duration via the service tier)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeId!: number;

  @ApiProperty({ description: 'Shop-local calendar day', example: '2026-07-25' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: ErrorMessages.AVAILABILITY_DATE_INVALID })
  date!: string;

  @ApiPropertyOptional({ description: 'Only this groomer (default: any available)' })
  @IsOptional()
  @IsString()
  staffId?: string;
}
