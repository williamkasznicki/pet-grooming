import { ApiProperty } from '@nestjs/swagger';
import { TimeOff } from '../../../generated/prisma/client.js';

export class TimeOffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  staffId!: string | null;

  @ApiProperty()
  isPermanent!: boolean;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  startsAt!: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  endsAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  reason!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(timeOff: TimeOff): TimeOffResponseDto {
    return {
      id: timeOff.id,
      staffId: timeOff.staffId,
      isPermanent: timeOff.isPermanent,
      startsAt: timeOff.startsAt?.toISOString() ?? null,
      endsAt: timeOff.endsAt?.toISOString() ?? null,
      reason: timeOff.reason,
      createdAt: timeOff.createdAt.toISOString(),
    };
  }
}
