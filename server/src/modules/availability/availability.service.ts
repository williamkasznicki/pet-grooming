import { Injectable, NotFoundException } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MinuteInterval,
  clampInterval,
  computeStaffSlots,
  mergeStaffSlots,
} from './availability.logic.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { AvailabilityResponseDto } from './dto/availability-response.dto.js';

/** Booking statuses that occupy a groomer's time. */
const BLOCKING_STATUS_CODES = ['CONFIRMED', 'IN_PROGRESS'];

const DAY_MIN = 1440;

type Settings = {
  timezone: string;
  shopHours: MinuteInterval;
  slotStepMin: number;
  minNoticeMin: number;
};

const DEFAULTS: Settings = {
  timezone: 'Asia/Bangkok',
  shopHours: { startMin: 9 * 60, endMin: 18 * 60 },
  slotStepMin: 30,
  minNoticeMin: 60,
};

/**
 * Deterministic availability engine (docs/DESIGN.md): for a service × pet size
 * on a shop-local day, returns the union of open slots across qualified
 * groomers. Every rule comes from PostgreSQL settings — nothing hardcoded.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    const [settings, tier] = await Promise.all([this.loadSettings(), this.loadTier(query)]);

    // Day bounds as absolute instants of the shop-local calendar day.
    const [year, month, day] = query.date.split('-').map(Number);
    const dayStart = new TZDate(year, month - 1, day, 0, 0, 0, settings.timezone);
    const dayEnd = addDays(dayStart, 1);
    const weekday = dayStart.getDay();

    const emptyResponse: AvailabilityResponseDto = {
      date: query.date,
      timezone: settings.timezone,
      durationMin: tier.durationMin,
      slots: [],
    };

    // Entirely past days have no availability; min-notice floors today's slots.
    const now = new Date();
    if (isBefore(dayEnd, now)) return emptyResponse;
    const noticeFloor = addMinutes(now, settings.minNoticeMin);
    const earliestStartMin = isAfter(noticeFloor, dayStart)
      ? Math.max(0, differenceInMinutes(noticeFloor, dayStart))
      : 0;
    if (earliestStartMin >= DAY_MIN) return emptyResponse;

    const staff = await this.prisma.client.staffProfile.findMany({
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
    const staffIds = staff.map((s) => s.id);

    const [bookings, shopTimeOff] = await Promise.all([
      this.prisma.client.booking.findMany({
        where: {
          staffId: { in: staffIds },
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart },
          status: { code: { in: BLOCKING_STATUS_CODES } },
        },
        select: { staffId: true, startsAt: true, endsAt: true },
      }),
      this.prisma.client.timeOff.findMany({
        where: {
          staffId: null,
          OR: [{ isPermanent: true }, { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }],
        },
        select: { isPermanent: true, startsAt: true, endsAt: true },
      }),
    ]);

    const wholeDay: MinuteInterval = { startMin: 0, endMin: DAY_MIN };
    const toInterval = (startsAt: Date, endsAt: Date): MinuteInterval | null =>
      clampInterval(
        {
          startMin: differenceInMinutes(startsAt, dayStart),
          endMin: differenceInMinutes(endsAt, dayStart),
        },
        wholeDay,
      );
    const timeOffIntervals = (rows: { isPermanent: boolean; startsAt: Date | null; endsAt: Date | null }[]) =>
      rows
        .map((t) => (t.isPermanent ? wholeDay : t.startsAt && t.endsAt ? toInterval(t.startsAt, t.endsAt) : null))
        .filter((i): i is MinuteInterval => i !== null);

    const shopBusy = timeOffIntervals(shopTimeOff);

    const perStaff = staff.map((member) => {
      const windows = member.workingHours
        .map((window) => clampInterval(window, settings.shopHours))
        .filter((w): w is MinuteInterval => w !== null);

      const busy: MinuteInterval[] = [
        ...shopBusy,
        ...timeOffIntervals(member.timeOff),
        ...bookings
          .filter((b) => b.staffId === member.id)
          .map((b) => toInterval(b.startsAt, b.endsAt))
          .filter((i): i is MinuteInterval => i !== null),
      ];

      return {
        staffId: member.id,
        slots: computeStaffSlots(windows, busy, tier.durationMin, settings.slotStepMin, earliestStartMin),
      };
    });

    const merged = mergeStaffSlots(perStaff);
    return {
      ...emptyResponse,
      slots: [...merged.entries()].map(([startMin, ids]) => ({
        start: addMinutes(dayStart, startMin).toISOString(),
        end: addMinutes(dayStart, startMin + tier.durationMin).toISOString(),
        staffIds: ids,
      })),
    };
  }

  private async loadTier(query: AvailabilityQueryDto): Promise<{ durationMin: number }> {
    const tier = await this.prisma.client.serviceTier.findFirst({
      where: {
        serviceId: query.serviceId,
        sizeId: query.sizeId,
        service: { active: true, deletedAt: null },
      },
      select: { durationMin: true },
    });
    if (!tier) {
      throw new NotFoundException(ErrorMessages.SERVICE_TIER_NOT_FOUND);
    }
    return tier;
  }

  private async loadSettings(): Promise<Settings> {
    const rows = await this.prisma.client.shopSetting.findMany({
      where: { key: { in: ['shop.timezone', 'shop.hours', 'booking.slotStepMin', 'booking.minNoticeMin'] } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));

    const hours = byKey.get('shop.hours') as { openMin?: number; closeMin?: number } | undefined;
    return {
      timezone: (byKey.get('shop.timezone') as string | undefined) ?? DEFAULTS.timezone,
      shopHours:
        hours?.openMin !== undefined && hours?.closeMin !== undefined
          ? { startMin: hours.openMin, endMin: hours.closeMin }
          : DEFAULTS.shopHours,
      slotStepMin: (byKey.get('booking.slotStepMin') as number | undefined) ?? DEFAULTS.slotStepMin,
      minNoticeMin: (byKey.get('booking.minNoticeMin') as number | undefined) ?? DEFAULTS.minNoticeMin,
    };
  }
}
