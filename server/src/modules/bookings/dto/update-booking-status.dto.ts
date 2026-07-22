import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Staff-driven transitions. Cancellation has its own endpoint (cutoff rules). */
export const STAFF_TRANSITION_TARGETS = ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const;

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: STAFF_TRANSITION_TARGETS })
  @IsIn([...STAFF_TRANSITION_TARGETS])
  toStatusCode!: (typeof STAFF_TRANSITION_TARGETS)[number];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
