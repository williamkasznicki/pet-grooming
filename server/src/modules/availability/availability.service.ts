import { Injectable, NotFoundException } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';
import { addDays, addMinutes, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import { ErrorMessages } from '../../common/constants/error-messages.constant.js';
import { now } from '../../common/utils/clock.util.js';
import {
  ShopOperatingSettings,
  parseOperatingSettings,
} from '../shop-settings/shop-operating-settings.js';
import {
  MinuteInterval,
  clampInterval,
  computeStaffSlots,
  mergeStaffSlots,
} from './availability.logic.js';
import { AvailabilityRepository } from './availability.repository.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { AvailabilityResponseDto } from './dto/availability-response.dto.js';

/** Booking statuses that occupy a groomer's time. */
const BLOCKING_STATUS_CODES = [ 'CONFIRMED', 'IN_PROGRESS' ];

const DAY_MIN = 1440; // 60 min * 24 h

/**
 * Deterministic availability engine (docs/DESIGN.md): for a service × pet size
 * on a shop-local day, returns the union of open slots across qualified
 * groomers. Every rule comes from PostgreSQL settings — nothing hardcoded.
 */
@Injectable()
export class AvailabilityService {
  constructor ( private readonly availabilityRepository: AvailabilityRepository ) { }

  async getAvailability ( query: AvailabilityQueryDto ): Promise<AvailabilityResponseDto> {
    const [ settings, tier ] = await Promise.all( [ this.loadSettings(), this.loadTier( query ) ] );

    // Day bounds as absolute instants of the shop-local calendar day.
    const [ year, month, day ] = query.date.split( '-' ).map( Number );
    const dayStart = new TZDate( year, month - 1, day, 0, 0, 0, settings.timezone );
    const dayEnd = addDays( dayStart, 1 );
    const weekday = dayStart.getDay();

    const emptyResponse: AvailabilityResponseDto = {
      date: query.date,
      timezone: settings.timezone,
      durationMin: tier.durationMin,
      slots: [],
    };

    // Entirely past days have no availability; min-notice floors today's slots.
    const current = now();
    if ( isBefore( dayEnd, current ) ) return emptyResponse;
    const noticeFloor = addMinutes( current, settings.minNoticeMin );
    const earliestStartMin = isAfter( noticeFloor, dayStart )
      ? Math.max( 0, differenceInMinutes( noticeFloor, dayStart ) )
      : 0;
    if ( earliestStartMin >= DAY_MIN ) return emptyResponse;

    const staff = await this.availabilityRepository.findActiveStaffForDay( query, weekday, dayStart, dayEnd );
    const staffIds = staff.map( ( s ) => s.id );

    const [ bookings, shopTimeOff ] = await Promise.all( [
      this.availabilityRepository.findBlockingBookings( staffIds, dayStart, dayEnd, BLOCKING_STATUS_CODES ),
      this.availabilityRepository.findShopTimeOffForDay( dayStart, dayEnd ),
    ] );

    const wholeDay: MinuteInterval = { startMin: 0, endMin: DAY_MIN };
    const toInterval = ( startsAt: Date, endsAt: Date ): MinuteInterval | null =>
      clampInterval(
        {
          startMin: differenceInMinutes( startsAt, dayStart ),
          endMin: differenceInMinutes( endsAt, dayStart ),
        },
        wholeDay,
      );
    const timeOffIntervals = ( rows: { isPermanent: boolean; startsAt: Date | null; endsAt: Date | null }[] ) =>
      rows
        .map( ( t ) => ( t.isPermanent ? wholeDay : t.startsAt && t.endsAt ? toInterval( t.startsAt, t.endsAt ) : null ) )
        .filter( ( i ): i is MinuteInterval => i !== null );

    const shopBusy = timeOffIntervals( shopTimeOff );

    const shopHours: MinuteInterval = { startMin: settings.openMin, endMin: settings.closeMin };
    const perStaff = staff.map( ( member ) => {
      const windows = member.workingHours
        .map( ( window ) => clampInterval( window, shopHours ) )
        .filter( ( w ): w is MinuteInterval => w !== null );

      const busy: MinuteInterval[] = [
        ...shopBusy,
        ...timeOffIntervals( member.timeOff ),
        ...bookings
          .filter( ( b ) => b.staffId === member.id )
          .map( ( b ) => toInterval( b.startsAt, b.endsAt ) )
          .filter( ( i ): i is MinuteInterval => i !== null ),
      ];

      return {
        staffId: member.id,
        slots: computeStaffSlots( windows, busy, tier.durationMin, settings.slotStepMin, earliestStartMin ),
      };
    } );

    const merged = mergeStaffSlots( perStaff );
    return {
      ...emptyResponse,
      slots: [ ...merged.entries() ].map( ( [ startMin, ids ] ) => ( {
        start: addMinutes( dayStart, startMin ).toISOString(),
        end: addMinutes( dayStart, startMin + tier.durationMin ).toISOString(),
        staffIds: ids,
      } ) ),
    };
  }

  private async loadTier ( query: AvailabilityQueryDto ): Promise<{ durationMin: number }> {
    const tier = await this.availabilityRepository.findActiveTier( query );
    if ( !tier ) {
      console.log( `No active service tier for serviceId=${ query.serviceId } sizeId=${ query.sizeId }` );
      throw new NotFoundException( ErrorMessages.SERVICE_TIER_NOT_FOUND );
    }
    return tier;
  }

  private async loadSettings (): Promise<ShopOperatingSettings> {
    const rows = await this.availabilityRepository.findOperatingSettings();
    return parseOperatingSettings( rows );
  }
}
