import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

export type AvailabilityStaff = Prisma.StaffProfileGetPayload<{
  select: {
    id: true;
    workingHours: { select: { startMin: true; endMin: true } };
    timeOff: { select: { isPermanent: true; startsAt: true; endsAt: true } };
  };
}>;

export type BlockingBooking = Prisma.BookingGetPayload<{
  select: { staffId: true; startsAt: true; endsAt: true };
}>;

export type AvailabilityTimeOff = Prisma.TimeOffGetPayload<{
  select: { isPermanent: true; startsAt: true; endsAt: true };
}>;

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveStaffForDay(query: Pick<AvailabilityQueryDto, 'staffId'>, weekday: number, dayStart: Date, dayEnd: Date): Promise<AvailabilityStaff[]> {
    return this.prisma.client.staffProfile.findMany({
      where: { active: true, ...(query.staffId ? { id: query.staffId } : {}) },
      select: {
        id: true,
        workingHours: { where: { weekday }, select: { startMin: true, endMin: true } },
        timeOff: {
          where: {
            OR: [{ isPermanent: true }, { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }],
          },
          select: { isPermanent: true, startsAt: true, endsAt: true },
        },
      },
    });
  }

  findBlockingBookings(staffIds: string[], dayStart: Date, dayEnd: Date, statusCodes: string[]): Promise<BlockingBooking[]> {
    return this.prisma.client.booking.findMany({
      where: {
        staffId: { in: staffIds },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        status: { code: { in: statusCodes } },
      },
      select: { staffId: true, startsAt: true, endsAt: true },
    });
  }

  findShopTimeOffForDay(dayStart: Date, dayEnd: Date): Promise<AvailabilityTimeOff[]> {
    return this.prisma.client.timeOff.findMany({
      where: {
        staffId: null,
        OR: [{ isPermanent: true }, { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }],
      },
      select: { isPermanent: true, startsAt: true, endsAt: true },
    });
  }

  findActiveTier(query: Pick<AvailabilityQueryDto, 'serviceId' | 'sizeId'>): Promise<{ durationMin: number } | null> {
    return this.prisma.client.serviceTier.findFirst({
      where: {
        serviceId: query.serviceId,
        sizeId: query.sizeId,
        service: { active: true, deletedAt: null },
      },
      select: { durationMin: true },
    });
  }

  findAvailabilitySettings(): Promise<Prisma.ShopSettingGetPayload<object>[]> {
    return this.prisma.client.shopSetting.findMany({
      where: { key: { in: ['shop.timezone', 'shop.hours', 'booking.slotStepMin', 'booking.minNoticeMin'] } },
    });
  }
}
