/**
 * Pure slot-computation logic for the availability engine. No I/O, no Date —
 * everything is minutes-from-midnight in the SHOP's timezone, so it is
 * deterministic and trivially unit-testable (availability.logic.spec.ts).
 *
 * The service layer (availability.service.ts) converts DB rows to these
 * minute intervals and slot starts back to timezone-aware ISO instants.
 */

/** Half-open interval [startMin, endMin) in minutes from midnight, shop-local. */
export type MinuteInterval = { startMin: number; endMin: number };

/** Clamp an interval to bounds; returns null when nothing remains. */
export function clampInterval ( interval: MinuteInterval, bounds: MinuteInterval ): MinuteInterval | null {
  const startMin = Math.max( interval.startMin, bounds.startMin );
  const endMin = Math.min( interval.endMin, bounds.endMin );
  return startMin < endMin ? { startMin, endMin } : null;
}

export function overlaps ( a: MinuteInterval, b: MinuteInterval ): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Sort + coalesce overlapping/adjacent intervals: O(n log n), output sorted + disjoint. */
export function mergeIntervals ( intervals: MinuteInterval[] ): MinuteInterval[] {
  if ( intervals.length <= 1 ) return [ ...intervals ];
  const sorted = [ ...intervals ].sort( ( a, b ) => a.startMin - b.startMin );
  const merged: MinuteInterval[] = [ { ...sorted[ 0 ] } ];
  for ( let i = 1; i < sorted.length; i++ ) {
    const last = merged[ merged.length - 1 ];
    if ( sorted[ i ].startMin <= last.endMin ) {
      last.endMin = Math.max( last.endMin, sorted[ i ].endMin );
    } else {
      merged.push( { ...sorted[ i ] } );
    }
  }
  return merged;
}

/**
 * Slot starts for ONE staff member.
 *
 * and coalesced once, then a single forward pointer walks the disjoint busy
 * list while candidates advance monotonically. No per-candidate rescans; S
 * (the emitted candidate count) is a lower bound for any correct algorithm.
 *
 * @param workingWindows admin-set windows for the weekday, already clamped to shop hours
 * @param busy bookings + time-off for the day, as minute intervals
 * @param durationMin service duration for the pet's size tier
 * @param stepMin slot grid step (setting booking.slotStepMin)
 * @param earliestStartMin no slot may start before this (today: now + min notice; other days: 0)
 * @returns sorted unique slot start minutes
 */
export function computeStaffSlots (
  workingWindows: MinuteInterval[],
  busy: MinuteInterval[],
  durationMin: number,
  stepMin: number,
  earliestStartMin = 0,
): number[] {
  if ( durationMin <= 0 || stepMin <= 0 ) return [];

  // Merging windows also dedupes/sorts them, so emitted slots are sorted + unique by construction.
  const windows = mergeIntervals( workingWindows );
  const mergedBusy = mergeIntervals( busy );

  const slots: number[] = [];
  let busyIdx = 0; // monotonic across windows — both lists are sorted
  for ( const window of windows ) {
    // Align the first candidate to the global step grid (00:00-based), not the window start,
    // so 09:10–17:00 with a 30-min step still yields 09:30, 10:00, … not 09:10, 09:40.
    let start = Math.max( window.startMin, earliestStartMin );
    start = Math.ceil( start / stepMin ) * stepMin;

    for ( ; start + durationMin <= window.endMin; start += stepMin ) {
      const candidateEnd = start + durationMin;
      // Advance past busy intervals that end at/before this candidate's start.
      while ( busyIdx < mergedBusy.length && mergedBusy[ busyIdx ].endMin <= start ) busyIdx++;
      // Disjoint + sorted ⇒ only the current busy interval can overlap the candidate.
      if ( busyIdx >= mergedBusy.length || mergedBusy[ busyIdx ].startMin >= candidateEnd ) {
        slots.push( start );
      }
    }
  }
  return slots;
}

/** Merge per-staff slot lists into { slotStart → staffIds } (sorted by slot). */
export function mergeStaffSlots ( perStaff: { staffId: string; slots: number[] }[] ): Map<number, string[]> {
  const merged = new Map<number, string[]>();
  for ( const { staffId, slots } of perStaff ) {
    for ( const slot of slots ) {
      const ids = merged.get( slot ) ?? [];
      ids.push( staffId );
      merged.set( slot, ids );
    }
  }
  return new Map( [ ...merged.entries() ].sort( ( [ a ], [ b ] ) => a - b ) );
}

/**
 * Deterministic auto-assignment for "any available" bookings (docs/DESIGN.md):
 * the least-loaded free groomer that day; ties broken by staff id for stability.
 */
export function pickStaff ( freeStaffIds: string[], bookingsCountByStaff: Map<string, number> ): string | null {
  if ( freeStaffIds.length === 0 ) return null;
  return [ ...freeStaffIds ].sort( ( a, b ) => {
    const loadDiff = ( bookingsCountByStaff.get( a ) ?? 0 ) - ( bookingsCountByStaff.get( b ) ?? 0 );
    return loadDiff !== 0 ? loadDiff : a.localeCompare( b );
  } )[ 0 ];
}
