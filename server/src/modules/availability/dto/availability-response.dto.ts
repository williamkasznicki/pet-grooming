import { ApiProperty } from '@nestjs/swagger';

export class AvailabilitySlotDto {
  @ApiProperty({ format: 'date-time', description: 'Slot start (UTC instant)' })
  start!: string;

  @ApiProperty({ format: 'date-time' })
  end!: string;

  @ApiProperty({ type: [String], description: 'Groomers free for this slot ("any available" pool)' })
  staffIds!: string[];
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: '2026-07-25' })
  date!: string;

  @ApiProperty({ example: 'Asia/Bangkok' })
  timezone!: string;

  @ApiProperty({ description: 'Duration used for slot fitting (service × size tier)' })
  durationMin!: number;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots!: AvailabilitySlotDto[];
}
