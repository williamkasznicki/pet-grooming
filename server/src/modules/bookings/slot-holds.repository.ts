import { Injectable } from '@nestjs/common';
import { now } from '../../common/utils/clock.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export type CreateSlotHoldData = {
  staffId: string;
  userId: string;
  petId: string;
  startsAt: Date;
  endsAt: Date;
  expiresAt: Date;
};

/**
 * Ephemeral slot reservations (TTL, no FK). A hold parks a groomer+time for a
 * few minutes while a client finishes the wizard, so two people racing the same
 * slot don't both reach the confirm step. Expired rows are swept lazily on the
 * next acquire; the serializable booking transaction remains the real guard.
 */
@Injectable()
export class SlotHoldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Best-effort GC of lapsed holds; keeps the table from growing unbounded. */
  async sweepExpired(): Promise<void> {
    await this.prisma.client.slotHold.deleteMany({ where: { expiresAt: { lte: now() } } });
  }

  /** Staff (of the given set) with a live hold overlapping [startsAt, endsAt) owned by someone else. */
  async findHeldStaffByOthers(
    staffIds: string[],
    startsAt: Date,
    endsAt: Date,
    excludeUserId: string,
  ): Promise<string[]> {
    if (staffIds.length === 0) return [];
    const rows = await this.prisma.client.slotHold.findMany({
      where: {
        staffId: { in: staffIds },
        userId: { not: excludeUserId },
        expiresAt: { gt: now() },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { staffId: true },
      distinct: ['staffId'],
    });
    return rows.map((row) => row.staffId);
  }

  create(data: CreateSlotHoldData): Promise<{ id: string; staffId: string; expiresAt: Date }> {
    return this.prisma.client.slotHold.create({
      data,
      select: { id: true, staffId: true, expiresAt: true },
    });
  }

  /** Drop this user's holds at a given start (re-acquire replaces, booking clears). */
  async deleteByUserAndStart(userId: string, startsAt: Date): Promise<void> {
    await this.prisma.client.slotHold.deleteMany({ where: { userId, startsAt } });
  }

  /** Release a hold the user owns; returns whether a row was removed. */
  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.client.slotHold.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
