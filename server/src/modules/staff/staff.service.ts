import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isBefore } from 'date-fns';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { CreateTimeOffDto } from './dto/create-time-off.dto.js';
import { StaffPublicDto } from './dto/staff-public.dto.js';
import { StaffResponseDto, StaffWithDetails, WorkingHoursResponseDto } from './dto/staff-response.dto.js';
import { TimeOffResponseDto } from './dto/time-off-response.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { ReplaceWorkingHoursDto, WorkingHoursEntryDto } from './dto/upsert-working-hours.dto.js';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(): Promise<StaffPublicDto[]> {
    const staff = await this.prisma.client.staffProfile.findMany({
      where: { active: true },
      select: { id: true, displayName: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return staff.map((profile) => StaffPublicDto.from(profile));
  }

  async findAdmin(): Promise<StaffResponseDto[]> {
    const staff = await this.prisma.client.staffProfile.findMany({
      include: this.staffDetailsInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return staff.map((profile) => StaffResponseDto.from(profile));
  }

  async create(dto: CreateStaffDto): Promise<StaffResponseDto> {
    await this.ensureUserExists(dto.userId);

    try {
      const staff = await this.prisma.client.staffProfile.create({
        data: {
          userId: dto.userId,
          displayName: dto.displayName,
          bio: dto.bio,
        },
        include: this.staffDetailsInclude(),
      });
      return StaffResponseDto.from(staff);
    } catch (error) {
      this.translateStaffCreateError(error);
    }
  }

  async findOne(id: string): Promise<StaffResponseDto> {
    const staff = await this.findExistingStaff(id, true);
    return StaffResponseDto.from(staff);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<StaffResponseDto> {
    await this.ensureStaffExists(id);

    try {
      const staff = await this.prisma.client.staffProfile.update({
        where: { id },
        data: {
          displayName: dto.displayName,
          bio: dto.bio,
          active: dto.active,
        },
        include: this.staffDetailsInclude(),
      });
      return StaffResponseDto.from(staff);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async replaceWorkingHours(id: string, dto: ReplaceWorkingHoursDto): Promise<WorkingHoursResponseDto[]> {
    await this.ensureStaffExists(id);
    this.validateWorkingHours(dto.entries);

    try {
      const writes = [this.prisma.client.workingHours.deleteMany({ where: { staffId: id } })];
      if (dto.entries.length > 0) {
        writes.push(
          this.prisma.client.workingHours.createMany({
            data: dto.entries.map((entry) => ({
              staffId: id,
              weekday: entry.weekday,
              startMin: entry.startMin,
              endMin: entry.endMin,
            })),
          }),
        );
      }
      await this.prisma.client.$transaction(writes);

      const entries = await this.prisma.client.workingHours.findMany({
        where: { staffId: id },
        orderBy: [{ weekday: 'asc' }, { startMin: 'asc' }],
      });
      return entries.map((entry) => WorkingHoursResponseDto.from(entry));
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async createStaffTimeOff(staffId: string, dto: CreateTimeOffDto): Promise<TimeOffResponseDto> {
    await this.ensureStaffExists(staffId);
    return this.createTimeOff(staffId, dto);
  }

  async removeStaffTimeOff(staffId: string, timeOffId: string): Promise<TimeOffResponseDto> {
    const timeOff = await this.prisma.client.timeOff.findFirst({ where: { id: timeOffId, staffId } });
    if (!timeOff) {
      throw new NotFoundException(ErrorMessages.TIME_OFF_NOT_FOUND);
    }

    try {
      const deleted = await this.prisma.client.timeOff.delete({ where: { id: timeOffId } });
      return TimeOffResponseDto.from(deleted);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async findShopTimeOff(): Promise<TimeOffResponseDto[]> {
    const timeOff = await this.prisma.client.timeOff.findMany({
      where: { staffId: null },
      orderBy: [{ isPermanent: 'desc' }, { startsAt: 'asc' }, { createdAt: 'desc' }],
    });
    return timeOff.map((entry) => TimeOffResponseDto.from(entry));
  }

  async createShopTimeOff(dto: CreateTimeOffDto): Promise<TimeOffResponseDto> {
    return this.createTimeOff(null, dto);
  }

  async removeShopTimeOff(timeOffId: string): Promise<TimeOffResponseDto> {
    const timeOff = await this.prisma.client.timeOff.findFirst({ where: { id: timeOffId, staffId: null } });
    if (!timeOff) {
      throw new NotFoundException(ErrorMessages.TIME_OFF_NOT_FOUND);
    }

    try {
      const deleted = await this.prisma.client.timeOff.delete({ where: { id: timeOffId } });
      return TimeOffResponseDto.from(deleted);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private async createTimeOff(staffId: string | null, dto: CreateTimeOffDto): Promise<TimeOffResponseDto> {
    this.validateTimeOffRange(dto);

    try {
      const timeOff = await this.prisma.client.timeOff.create({
        data: {
          staffId,
          isPermanent: dto.isPermanent ?? false,
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          reason: dto.reason,
        },
      });
      return TimeOffResponseDto.from(timeOff);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  private staffDetailsInclude() {
    return {
      user: { select: { name: true, email: true } },
      workingHours: { orderBy: [{ weekday: 'asc' as const }, { startMin: 'asc' as const }] },
    };
  }

  private staffDetailWithTimeOffInclude() {
    return {
      ...this.staffDetailsInclude(),
      timeOff: {
        where: {
          OR: [{ isPermanent: true }, { endsAt: { gte: new Date() } }],
        },
        orderBy: [{ isPermanent: 'desc' as const }, { startsAt: 'asc' as const }, { createdAt: 'desc' as const }],
      },
    };
  }

  private async findExistingStaff(id: string, withTimeOff = false): Promise<StaffWithDetails> {
    const staff = await this.prisma.client.staffProfile.findFirst({
      where: { id },
      include: withTimeOff ? this.staffDetailWithTimeOffInclude() : this.staffDetailsInclude(),
    });
    if (!staff) {
      throw new NotFoundException(ErrorMessages.STAFF_NOT_FOUND);
    }
    return staff;
  }

  private async ensureStaffExists(id: string): Promise<void> {
    const staff = await this.prisma.client.staffProfile.findFirst({ where: { id }, select: { id: true } });
    if (!staff) {
      throw new NotFoundException(ErrorMessages.STAFF_NOT_FOUND);
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.client.user.findFirst({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
  }

  private validateWorkingHours(entries: WorkingHoursEntryDto[]): void {
    for (const entry of entries) {
      if (entry.startMin >= entry.endMin) {
        throw new BadRequestException(ErrorMessages.WORKING_HOURS_OVERLAP);
      }
    }

    const sorted = [...entries].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin || a.endMin - b.endMin);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (previous.weekday === current.weekday && previous.endMin > current.startMin) {
        throw new BadRequestException(ErrorMessages.WORKING_HOURS_OVERLAP);
      }
    }
  }

  private validateTimeOffRange(dto: CreateTimeOffDto): void {
    if (dto.isPermanent) {
      return;
    }

    if (!dto.startsAt || !dto.endsAt || !isBefore(dto.startsAt, dto.endsAt)) {
      throw new BadRequestException(ErrorMessages.TIME_OFF_RANGE_INVALID);
    }
  }

  private translateStaffCreateError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(ErrorMessages.STAFF_PROFILE_EXISTS);
    }

    translatePrismaError(error);
  }
}
