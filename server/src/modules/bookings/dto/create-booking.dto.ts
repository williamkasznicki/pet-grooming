import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'Your pet id (size determines price/duration tier)' })
  @IsString()
  petId!: string;

  @ApiProperty({ format: 'date-time', description: 'Slot start from GET /availability' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiPropertyOptional({ description: 'Preferred groomer; omitted = server assigns the least-loaded free groomer' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
