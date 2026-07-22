import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { Prisma, StaffProfile, TimeOff, WorkingHours } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type StaffPublicProfile = Pick<StaffProfile, 'id' | 'displayName'> & { user: { name: string } };
export type StaffWithDetails = StaffProfile & {
  user: { name: string; email: string };
  workingHours: WorkingHours[];
  timeOff?: TimeOff[];
};
export type WeeklyHoursEntry = Pick<WorkingHours, 'weekday' | 'startMin' | 'endMin'>;

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyPublic(): Promise<StaffPublicProfile[]> {
    return this.prisma.client.staffProfile.findMany({
      where: { active: true },
      select: { id: true, displayName: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findManyAdmin(): Promise<StaffWithDetails[]> {
    return this.prisma.client.staffProfile.findMany({
      include: this.staffDetailsInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.StaffProfileUncheckedCreateInput): Promise<StaffWithDetails> {
    return this.prisma.client.staffProfile.create({
      data,
      include: this.staffDetailsInclude(),
    });
  }

  update(id: string, data: Prisma.StaffProfileUpdateInput): Promise<StaffWithDetails> {
    return this.prisma.client.staffProfile.update({
      where: { id },
      data,
      include: this.staffDetailsInclude(),
    });
  }

  findByIdWithDetails(id: string, withTimeOff = false): Promise<StaffWithDetails | null> {
    return this.prisma.client.staffProfile.findFirst({
      where: { id },
      include: withTimeOff ? this.staffDetailWithTimeOffInclude() : this.staffDetailsInclude(),
    });
  }

  async staffExists(id: string): Promise<boolean> {
    const staff = await this.prisma.client.staffProfile.findFirst({ where: { id }, select: { id: true } });
    return staff !== null;
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.client.user.findFirst({ where: { id: userId }, select: { id: true } });
    return user !== null;
  }

  async replaceWeeklyHours(staffId: string, entries: WeeklyHoursEntry[]): Promise<WorkingHours[]> {
    const writes = [this.prisma.client.workingHours.deleteMany({ where: { staffId } })];
    if (entries.length > 0) {
      writes.push(
        this.prisma.client.workingHours.createMany({
          data: entries.map((entry) => ({
            staffId,
            weekday: entry.weekday,
            startMin: entry.startMin,
            endMin: entry.endMin,
          })),
        }),
      );
    }
    await this.prisma.client.$transaction(writes);

    return this.prisma.client.workingHours.findMany({
      where: { staffId },
      orderBy: [{ weekday: 'asc' }, { startMin: 'asc' }],
    });
  }

  findStaffTimeOffById(staffId: string, timeOffId: string): Promise<TimeOff | null> {
    return this.prisma.client.timeOff.findFirst({ where: { id: timeOffId, staffId } });
  }

  findShopTimeOffById(timeOffId: string): Promise<TimeOff | null> {
    return this.prisma.client.timeOff.findFirst({ where: { id: timeOffId, staffId: null } });
  }

  deleteTimeOff(timeOffId: string): Promise<TimeOff> {
    return this.prisma.client.timeOff.delete({ where: { id: timeOffId } });
  }

  findShopTimeOff(): Promise<TimeOff[]> {
    return this.prisma.client.timeOff.findMany({
      where: { staffId: null },
      orderBy: [{ isPermanent: 'desc' }, { startsAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  createTimeOff(data: Prisma.TimeOffUncheckedCreateInput): Promise<TimeOff> {
    return this.prisma.client.timeOff.create({ data });
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
          OR: [{ isPermanent: true }, { endsAt: { gte: now() } }],
        },
        orderBy: [{ isPermanent: 'desc' as const }, { startsAt: 'asc' as const }, { createdAt: 'desc' as const }],
      },
    };
  }
}
