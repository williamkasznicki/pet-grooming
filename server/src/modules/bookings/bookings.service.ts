import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { addMinutes, differenceInMinutes, isBefore, subHours, subMinutes } from 'date-fns';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { AuthUser, hasPermission } from '../../common/types/auth.types.js';
import { now } from '../../common/utils/clock.util.js';
import { clientScope } from '../../common/utils/scope.util.js';
import { translatePrismaError } from '../../common/utils/prisma-error.util.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { pickStaff } from '../availability/availability.logic.js';
import { MailService } from '../mail/mail.service.js';
import { parseOperatingSettings } from '../shop-settings/shop-operating-settings.js';
import { BookingsRepository, BookingRowScope, BookingWithRelations } from './bookings.repository.js';
import { SlotHoldsRepository } from './slot-holds.repository.js';
import { BookingResponseDto } from './dto/booking-response.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { HoldSlotDto, SlotHoldResponseDto } from './dto/hold-slot.dto.js';
import { OverrideBookingDto } from './dto/override-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

const BLOCKING_STATUS_CODES = ['CONFIRMED', 'IN_PROGRESS'];

// Anti-spam limits for self-service booking (staff/admin with "*" bypass).
const MAX_UPCOMING_PER_CLIENT = 5;
const CREATE_THROTTLE_WINDOW_MIN = 10;
const CREATE_THROTTLE_MAX = 3;

// How long a wizard slot reservation survives before it can be reclaimed.
const HOLD_TTL_MIN = 3;

/** Shared slot resolution: everything create/hold need before assigning a groomer. */
type PreparedSlot = {
  pet: { id: string; name: string; sizeId: number };
  tier: { priceThb: Prisma.Decimal; durationMin: number; service: { name: string } };
  settings: ReturnType<typeof parseOperatingSettings>;
  startsAt: TZDate;
  endsAt: Date;
  dayStart: TZDate;
  candidateStaffIds: string[];
  load: Map<string, number>;
};

/** Legal lifecycle transitions (docs/DESIGN.md). Terminal states have no exits. */
const TRANSITIONS: Record<string, readonly string[]> = {
  CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly slotHoldsRepository: SlotHoldsRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly mailService: MailService,
  ) {}

  /** Instant-confirm create. Slot validity is proven via the availability engine,
   *  then enforced again inside a serializable transaction (no double booking). */
  async create(dto: CreateBookingDto, user: AuthUser): Promise<BookingResponseDto> {
    // Ghost-spam guards for self-service clients (staff/admin bypass).
    if (!hasPermission(user, '*')) {
      await this.enforceBookingLimits(user.id);
    }

    const prepared = await this.prepareSlot(dto, user);
    const { pet, tier, settings, startsAt, endsAt } = prepared;

    // Assign a groomer that is free AND not reserved by another wizard right now.
    const staffId = await this.selectFreeStaff(prepared, dto.staffId, user.id);

    const [confirmed, unpaid] = await Promise.all([
      this.bookingsRepository.findStatusByCode('CONFIRMED'),
      this.bookingsRepository.findPaymentStatusByCode('UNPAID'),
    ]);
    if (!confirmed || !unpaid) throw new NotFoundException(ErrorMessages.RECORD_NOT_FOUND);

    const booking = await this.createSerializable({
      clientId: user.id,
      petId: pet.id,
      serviceId: dto.serviceId,
      staffId,
      startsAt,
      endsAt,
      priceThb: tier.priceThb.toString(),
      durationMin: tier.durationMin,
      statusId: confirmed.id,
      paymentStatusId: unpaid.id,
      notes: dto.notes,
    });

    // Our own reservation for this slot is now fulfilled — free it immediately.
    void this.slotHoldsRepository.deleteByUserAndStart(user.id, startsAt).catch(() => undefined);

    this.sendConfirmationEmail(booking, settings.timezone);
    return BookingResponseDto.from(booking);
  }

  /**
   * Reserve a groomer+time for a few minutes while the client finishes the
   * wizard. Returns the resolved groomer so the confirm step books exactly the
   * held one. Not a booking guarantee — the serializable create is still final.
   */
  async holdSlot(dto: HoldSlotDto, user: AuthUser): Promise<SlotHoldResponseDto> {
    const prepared = await this.prepareSlot(dto, user);
    const staffId = await this.selectFreeStaff(prepared, dto.staffId, user.id);

    // One live hold per user+slot: replace any earlier attempt on this start.
    await this.slotHoldsRepository.deleteByUserAndStart(user.id, prepared.startsAt);
    const hold = await this.slotHoldsRepository.create({
      staffId,
      userId: user.id,
      petId: prepared.pet.id,
      startsAt: prepared.startsAt,
      endsAt: prepared.endsAt,
      expiresAt: addMinutes(now(), HOLD_TTL_MIN),
    });
    return SlotHoldResponseDto.from(hold);
  }

  async releaseHold(id: string, user: AuthUser): Promise<void> {
    await this.slotHoldsRepository.deleteOwned(id, user.id);
  }

  /**
   * Prove a slot is real (owned pet, active tier, aligned, not too soon, open in
   * the availability engine) and gather what create/hold both need. Groomer
   * assignment is deferred to `selectFreeStaff` since holds affect it.
   */
  private async prepareSlot(
    dto: { serviceId: string; petId: string; startsAt: Date; staffId?: string },
    user: AuthUser,
  ): Promise<PreparedSlot> {
    // Pet must belong to the requester (super admin may act for anyone).
    const pet = await this.bookingsRepository.findOwnedPet(dto.petId, hasPermission(user, '*') ? undefined : user.id);
    if (!pet) throw new NotFoundException(ErrorMessages.PET_NOT_FOUND);

    const tier = await this.bookingsRepository.findActiveTier(dto.serviceId, pet.sizeId);
    if (!tier) throw new NotFoundException(ErrorMessages.SERVICE_TIER_NOT_FOUND);

    const settings = parseOperatingSettings(await this.bookingsRepository.findOperatingSettings());

    // The requested instant, viewed in the shop's timezone.
    const startsAt = new TZDate(dto.startsAt, settings.timezone);
    const dayStart = new TZDate(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate(), 0, 0, 0, settings.timezone);
    const startMin = differenceInMinutes(startsAt, dayStart);
    if (startMin % settings.slotStepMin !== 0) {
      throw new BadRequestException(ErrorMessages.BOOKING_SLOT_MISALIGNED);
    }
    if (isBefore(startsAt, addMinutes(now(), settings.minNoticeMin))) {
      throw new BadRequestException(ErrorMessages.BOOKING_TOO_SOON);
    }

    // Ask the deterministic engine whether this exact slot is open (and for whom).
    const date = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
    const availability = await this.availabilityService.getAvailability({
      serviceId: dto.serviceId,
      sizeId: pet.sizeId,
      date,
      staffId: dto.staffId,
    });
    const slot = availability.slots.find((s) => new Date(s.start).getTime() === startsAt.getTime());
    if (!slot) throw new ConflictException(ErrorMessages.BOOKING_SLOT_UNAVAILABLE);

    const dayEnd = addMinutes(dayStart, 1440);
    const load = await this.bookingsRepository.countBookingsByStaff(slot.staffIds, dayStart, dayEnd, BLOCKING_STATUS_CODES);

    return {
      pet,
      tier,
      settings,
      startsAt,
      endsAt: addMinutes(startsAt, tier.durationMin),
      dayStart,
      candidateStaffIds: slot.staffIds,
      load,
    };
  }

  /**
   * Pick a groomer that is both free (availability) and not held by another
   * client's wizard. "Any available" → least-loaded of the un-held groomers.
   * Throws SLOT_HELD when the only free groomers are momentarily reserved.
   */
  private async selectFreeStaff(prepared: PreparedSlot, preferredStaffId: string | undefined, userId: string): Promise<string> {
    await this.slotHoldsRepository.sweepExpired();
    const heldByOthers = new Set(
      await this.slotHoldsRepository.findHeldStaffByOthers(prepared.candidateStaffIds, prepared.startsAt, prepared.endsAt, userId),
    );

    if (preferredStaffId) {
      if (heldByOthers.has(preferredStaffId)) throw new ConflictException(ErrorMessages.SLOT_HELD);
      return preferredStaffId;
    }

    const free = prepared.candidateStaffIds.filter((id) => !heldByOthers.has(id));
    const staffId = pickStaff(free, prepared.load);
    if (staffId) return staffId;
    // Distinguish "someone's mid-booking" from "genuinely no groomer".
    throw new ConflictException(prepared.candidateStaffIds.length > 0 ? ErrorMessages.SLOT_HELD : ErrorMessages.BOOKING_SLOT_UNAVAILABLE);
  }

  /**
   * Prevent ghost-booking spam: cap concurrent upcoming bookings per client and
   * throttle rapid-fire creation. Cheap counts, run before the expensive
   * availability lookup. Staff/admin are exempt (checked by the caller).
   */
  private async enforceBookingLimits(clientId: string): Promise<void> {
    const [upcoming, recent] = await Promise.all([
      this.bookingsRepository.countActiveUpcomingByClient(clientId, now(), BLOCKING_STATUS_CODES),
      this.bookingsRepository.countCreatedByClientSince(clientId, subMinutes(now(), CREATE_THROTTLE_WINDOW_MIN)),
    ]);
    if (upcoming >= MAX_UPCOMING_PER_CLIENT) {
      throw new HttpException(ErrorMessages.BOOKING_LIMIT_REACHED, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent >= CREATE_THROTTLE_MAX) {
      throw new HttpException(ErrorMessages.BOOKING_RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async findAll(user: AuthUser): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingsRepository.findManyScoped(await this.rowScope(user));
    return bookings.map((booking) => BookingResponseDto.from(booking));
  }

  async findOne(id: string, user: AuthUser): Promise<BookingResponseDto> {
    const booking = await this.findScopedOrThrow(id, user);
    return BookingResponseDto.from(booking);
  }

  /** Staff transitions (IN_PROGRESS / COMPLETED / NO_SHOW / CANCELLED without cutoff). */
  async updateStatus(id: string, dto: UpdateBookingStatusDto, user: AuthUser): Promise<BookingResponseDto> {
    const booking = await this.findScopedOrThrow(id, user);
    return this.transition(booking, dto.toStatusCode, user, dto.note);
  }

  /** Client cancellation — enforces the admin-configured cutoff; staff/admin bypass it via updateStatus. */
  async cancelOwn(id: string, user: AuthUser): Promise<BookingResponseDto> {
    const booking = await this.findScopedOrThrow(id, user);

    if (!hasPermission(user, 'booking:update')) {
      const settings = parseOperatingSettings(await this.bookingsRepository.findOperatingSettings());
      const cutoff = subHours(booking.startsAt, settings.cancelCutoffHours);
      if (isBefore(cutoff, now())) {
        throw new ForbiddenException(ErrorMessages.BOOKING_CUTOFF_PASSED);
      }
    }
    return this.transition(booking, 'CANCELLED', user);
  }

  async markPaid(id: string, user: AuthUser): Promise<BookingResponseDto> {
    const booking = await this.findScopedOrThrow(id, user);
    if (booking.paymentStatus.code === 'PAID') {
      throw new ConflictException(ErrorMessages.BOOKING_ALREADY_PAID);
    }
    // NO_SHOW stays payable (shops may charge a fee); CANCELLED never is.
    if (booking.status.code === 'CANCELLED') {
      throw new ConflictException(ErrorMessages.BOOKING_CANCELLED_UNPAYABLE);
    }
    const paid = await this.bookingsRepository.findPaymentStatusByCode('PAID');
    if (!paid) throw new NotFoundException(ErrorMessages.RECORD_NOT_FOUND);

    try {
      return BookingResponseDto.from(await this.bookingsRepository.updatePaymentStatus(booking.id, paid.id));
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async override(id: string, dto: OverrideBookingDto, user: AuthUser): Promise<BookingResponseDto> {
    const booking = await this.findScopedOrThrow(id, user);
    if (!TRANSITIONS[booking.status.code]?.length) {
      // Terminal bookings are immutable.
      throw new ConflictException(ErrorMessages.BOOKING_STATUS_TRANSITION_INVALID);
    }

    try {
      const updated = await this.bookingsRepository.overrideBooking(booking.id, {
        priceThb: dto.priceThb,
        durationMin: dto.durationMin,
        endsAt: dto.durationMin !== undefined ? addMinutes(booking.startsAt, dto.durationMin) : undefined,
      });
      return BookingResponseDto.from(updated);
    } catch (error) {
      translatePrismaError(error);
    }
  }

  // ── internals ──────────────────────────────────────────────────────

  private async transition(
    booking: BookingWithRelations,
    toCode: string,
    user: AuthUser,
    note?: string,
  ): Promise<BookingResponseDto> {
    if (!TRANSITIONS[booking.status.code]?.includes(toCode)) {
      throw new ConflictException(ErrorMessages.BOOKING_STATUS_TRANSITION_INVALID);
    }
    const target = await this.bookingsRepository.findStatusByCode(toCode);
    if (!target) throw new NotFoundException(ErrorMessages.RECORD_NOT_FOUND);

    const updated = await this.bookingsRepository.transitionStatus(booking.id, booking.status.id, target.id, user.id, note);
    // null = someone else transitioned it concurrently — the precondition no longer holds.
    if (!updated) throw new ConflictException(ErrorMessages.BOOKING_STATUS_TRANSITION_INVALID);
    return BookingResponseDto.from(updated);
  }

  private async createSerializable(
    data: Parameters<BookingsRepository['createIfSlotFree']>[0],
  ): Promise<BookingWithRelations> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const booking = await this.bookingsRepository.createIfSlotFree(data, BLOCKING_STATUS_CODES);
        if (!booking) throw new ConflictException(ErrorMessages.BOOKING_SLOT_UNAVAILABLE);
        return booking;
      } catch (error) {
        // P2034: serialization conflict with a concurrent booking attempt. Retry once —
        // if the slot really was taken, the in-transaction clash check settles it.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt === 0) {
          continue;
        }
        if (error instanceof ConflictException) throw error;
        translatePrismaError(error);
      }
    }
    throw new ConflictException(ErrorMessages.BOOKING_SLOT_UNAVAILABLE);
  }

  /** Row scope: "*" sees all; staff see bookings assigned to them; clients see their own. */
  private async rowScope(user: AuthUser): Promise<BookingRowScope> {
    if (hasPermission(user, '*')) return {};
    if (hasPermission(user, 'booking:update')) {
      const profile = await this.bookingsRepository.findStaffProfileByUserId(user.id);
      if (profile) return { staffId: profile.id };
    }
    return clientScope(user);
  }

  private async findScopedOrThrow(id: string, user: AuthUser): Promise<BookingWithRelations> {
    const booking = await this.bookingsRepository.findByIdScoped(id, await this.rowScope(user));
    if (!booking) throw new NotFoundException(ErrorMessages.BOOKING_NOT_FOUND);
    return booking;
  }

  private sendConfirmationEmail(booking: BookingWithRelations, timezone: string): void {
    const local = new TZDate(booking.startsAt, timezone);
    void this.mailService
      .sendBookingConfirmation({
        to: booking.client.email,
        clientName: booking.client.name,
        petName: booking.pet.name,
        serviceName: booking.service.name,
        staffName: booking.staff.displayName ?? 'our team',
        startsAtLocal: `${local.toDateString()} ${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')} (${timezone})`,
        priceThb: booking.priceThb.toString(),
      })
      // Fire-and-forget: booking succeeds even when email fails; error already logged w/o PII.
      .catch(() => this.logger.warn(`Confirmation email failed for booking ${booking.id}`));
  }
}
