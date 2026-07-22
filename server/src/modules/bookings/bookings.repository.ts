import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { ClientScope } from '../../common/utils/scope.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OPERATING_SETTING_KEYS } from '../shop-settings/shop-operating-settings.js';

export const BOOKING_INCLUDE = {
  status: true,
  paymentStatus: true,
  service: { select: { id: true, name: true } },
  pet: { select: { id: true, name: true } },
  staff: { select: { id: true, displayName: true } },
  client: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

export type BookingRowScope = ClientScope | { staffId: string };

export type CreateBookingData = {
  clientId: string;
  petId: string;
  serviceId: string;
  staffId: string;
  startsAt: Date;
  endsAt: Date;
  priceThb: string;
  durationMin: number;
  statusId: number;
  paymentStatusId: number;
  notes?: string;
};

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStatusByCode(code: string): Promise<{ id: number; code: string } | null> {
    return this.prisma.client.mdBookingStatus.findFirst({ where: { code, isActive: true }, select: { id: true, code: true } });
  }

  findPaymentStatusByCode(code: string): Promise<{ id: number } | null> {
    return this.prisma.client.mdPaymentStatus.findFirst({ where: { code, isActive: true }, select: { id: true } });
  }

  findOperatingSettings(): Promise<{ key: string; value: unknown }[]> {
    return this.prisma.client.shopSetting.findMany({ where: { key: { in: [...OPERATING_SETTING_KEYS] } } });
  }

  findOwnedPet(petId: string, ownerId?: string): Promise<{ id: string; name: string; sizeId: number } | null> {
    return this.prisma.client.pet.findFirst({
      where: { id: petId, ...(ownerId ? { ownerId } : {}) },
      select: { id: true, name: true, sizeId: true },
    });
  }

  findActiveTier(serviceId: string, sizeId: number): Promise<{ priceThb: Prisma.Decimal; durationMin: number; service: { name: string } } | null> {
    return this.prisma.client.serviceTier.findFirst({
      where: { serviceId, sizeId, service: { active: true, deletedAt: null } },
      select: { priceThb: true, durationMin: true, service: { select: { name: true } } },
    });
  }

  /** Bookings per staff member that day with blocking statuses — pickStaff load input. */
  async countBookingsByStaff(staffIds: string[], dayStart: Date, dayEnd: Date, statusCodes: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.client.booking.groupBy({
      by: ['staffId'],
      where: {
        staffId: { in: staffIds },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        status: { code: { in: statusCodes } },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.staffId, row._count._all]));
  }

  /**
   * Double-booking-proof create: inside a SERIALIZABLE transaction, re-check
   * that no blocking booking overlaps the slot for this groomer — or for this
   * PET (a pet can't be groomed twice at once, even by different staff) —
   * then insert booking + CONFIRMED status event. Returns null when taken.
   * Concurrent conflicting attempts surface as Prisma P2034 (write conflict) —
   * the service translates/retries.
   */
  async createIfSlotFree(data: CreateBookingData, blockingStatusCodes: string[]): Promise<BookingWithRelations | null> {
    return this.prisma.client.$transaction(
      async (tx) => {
        const clash = await tx.booking.findFirst({
          where: {
            OR: [{ staffId: data.staffId }, { petId: data.petId }],
            startsAt: { lt: data.endsAt },
            endsAt: { gt: data.startsAt },
            status: { code: { in: blockingStatusCodes } },
          },
          select: { id: true },
        });
        if (clash) return null;

        const booking = await tx.booking.create({ data, include: BOOKING_INCLUDE });
        await tx.bookingStatusEvent.create({
          data: { bookingId: booking.id, fromStatusId: null, toStatusId: data.statusId, changedById: data.clientId },
        });
        return booking;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  findManyScoped(scope: BookingRowScope): Promise<BookingWithRelations[]> {
    return this.prisma.client.booking.findMany({
      where: scope,
      include: BOOKING_INCLUDE,
      orderBy: { startsAt: 'desc' },
    });
  }

  findByIdScoped(id: string, scope: BookingRowScope): Promise<BookingWithRelations | null> {
    return this.prisma.client.booking.findFirst({ where: { id, ...scope }, include: BOOKING_INCLUDE });
  }

  /**
   * Optimistic status transition: updates only when the row still has
   * fromStatusId (guards concurrent transitions), and records the event.
   * Returns the updated booking, or null when the precondition failed.
   */
  async transitionStatus(
    bookingId: string,
    fromStatusId: number,
    toStatusId: number,
    changedById: string,
    note?: string,
  ): Promise<BookingWithRelations | null> {
    return this.prisma.client.$transaction(async (tx) => {
      const { count } = await tx.booking.updateMany({
        where: { id: bookingId, statusId: fromStatusId },
        data: { statusId: toStatusId, updatedAt: now() },
      });
      if (count === 0) return null;

      await tx.bookingStatusEvent.create({
        data: { bookingId, fromStatusId, toStatusId, changedById, note },
      });
      return tx.booking.findFirst({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    });
  }

  updatePaymentStatus(bookingId: string, paymentStatusId: number): Promise<BookingWithRelations> {
    return this.prisma.client.booking.update({
      where: { id: bookingId },
      data: { paymentStatusId },
      include: BOOKING_INCLUDE,
    });
  }

  overrideBooking(
    bookingId: string,
    data: { priceThb?: string; durationMin?: number; endsAt?: Date },
  ): Promise<BookingWithRelations> {
    return this.prisma.client.booking.update({
      where: { id: bookingId },
      data: { ...data, overridden: true },
      include: BOOKING_INCLUDE,
    });
  }

  findStaffProfileByUserId(userId: string): Promise<{ id: string } | null> {
    return this.prisma.client.staffProfile.findFirst({ where: { userId }, select: { id: true } });
  }
}
