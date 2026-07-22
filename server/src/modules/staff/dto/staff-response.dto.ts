import { ApiProperty } from '@nestjs/swagger';
import { StaffProfile, TimeOff, WorkingHours } from '../../../generated/prisma/client.js';
import { TimeOffResponseDto } from './time-off-response.dto.js';

export type StaffWithDetails = StaffProfile & {
  user: { name: string; email: string };
  workingHours: WorkingHours[];
  timeOff?: TimeOff[];
};

export class StaffUserResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  static from(user: StaffWithDetails['user']): StaffUserResponseDto {
    return {
      name: user.name,
      email: user.email,
    };
  }
}

export class WorkingHoursResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty({ minimum: 0, maximum: 6 })
  weekday!: number;

  @ApiProperty({ minimum: 0, maximum: 1439 })
  startMin!: number;

  @ApiProperty({ minimum: 1, maximum: 1440 })
  endMin!: number;

  static from(entry: WorkingHours): WorkingHoursResponseDto {
    return {
      id: entry.id,
      staffId: entry.staffId,
      weekday: entry.weekday,
      startMin: entry.startMin,
      endMin: entry.endMin,
    };
  }
}

export class StaffResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, nullable: true })
  displayName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: StaffUserResponseDto })
  user!: StaffUserResponseDto;

  @ApiProperty({ type: [WorkingHoursResponseDto] })
  workingHours!: WorkingHoursResponseDto[];

  @ApiProperty({ type: [TimeOffResponseDto], required: false })
  timeOff?: TimeOffResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  static from(staff: StaffWithDetails): StaffResponseDto {
    return {
      id: staff.id,
      userId: staff.userId,
      displayName: staff.displayName,
      bio: staff.bio,
      active: staff.active,
      user: StaffUserResponseDto.from(staff.user),
      workingHours: staff.workingHours.map((entry) => WorkingHoursResponseDto.from(entry)),
      timeOff: staff.timeOff?.map((entry) => TimeOffResponseDto.from(entry)),
      createdAt: staff.createdAt.toISOString(),
    };
  }
}
