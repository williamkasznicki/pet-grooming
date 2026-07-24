import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

/** Request a short-lived reservation on a slot before the confirm step. */
export class HoldSlotDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  serviceId!: string;

  @ApiProperty({ description: 'Your pet id (size determines the tier duration)' })
  @IsString()
  petId!: string;

  @ApiProperty({ format: 'date-time', description: 'Slot start from GET /availability' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiPropertyOptional({ description: 'Preferred groomer; omitted = server picks a free one to hold' })
  @IsOptional()
  @IsString()
  staffId?: string;
}

export class SlotHoldResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Groomer the hold reserved — pass this to POST /bookings' }) staffId!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;

  static from(row: { id: string; staffId: string; expiresAt: Date }): SlotHoldResponseDto {
    return { id: row.id, staffId: row.staffId, expiresAt: row.expiresAt.toISOString() };
  }
}
