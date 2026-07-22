import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { addMinutes, differenceInMinutes, isBefore, subHours } from 'date-fns';
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
import { BookingResponseDto } from './dto/booking-response.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { OverrideBookingDto } from './dto/override-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

const BLOCKING_STATUS_CODES = ['CONFIRMED', 'IN_PROGRESS'];

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
    private readonly availabilityService: AvailabilityService,
    private readonly mailService: MailService,
  ) {}

  /** Instant-confirm create. Slot validity is proven via the availability engine,
   *  then enforced again inside a serializable transaction (no double booking). */
  async create(dto: CreateBookingDto, user: AuthUser): Promise<BookingResponseDto> {
    // Pet must belong to the requester (super admin may book for anyone).
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

    // "Any available": server assigns the least-loaded free groomer (docs/DESIGN.md).
    const dayEnd = addMinutes(dayStart, 1440);
    const load = await this.bookingsRepository.countBookingsByStaff(slot.staffIds, dayStart, dayEnd, BLOCKING_STATUS_CODES);
    const staffId = dto.staffId ?? pickStaff(slot.staffIds, load);
    if (!staffId) throw new ConflictException(ErrorMessages.BOOKING_SLOT_UNAVAILABLE);

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
      endsAt: addMinutes(startsAt, tier.durationMin),
      priceThb: tier.priceThb.toString(),
      durationMin: tier.durationMin,
      statusId: confirmed.id,
      paymentStatusId: unpaid.id,
      notes: dto.notes,
    });

    this.sendConfirmationEmail(booking, settings.timezone);
    return BookingResponseDto.from(booking);
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
