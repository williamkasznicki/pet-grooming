import { clampInterval, computeStaffSlots, mergeStaffSlots, overlaps, pickStaff } from './availability.logic.js';

const win = (startMin: number, endMin: number) => ({ startMin, endMin });

describe('clampInterval', () => {
  it('clamps to bounds', () => {
    expect(clampInterval(win(480, 1080), win(540, 1020))).toEqual(win(540, 1020));
  });
  it('returns null when disjoint', () => {
    expect(clampInterval(win(480, 540), win(600, 700))).toBeNull();
  });
});

describe('overlaps', () => {
  it('detects overlap and respects half-open bounds', () => {
    expect(overlaps(win(540, 600), win(570, 630))).toBe(true);
    expect(overlaps(win(540, 600), win(600, 660))).toBe(false); // back-to-back is fine
  });
});

describe('computeStaffSlots', () => {
  // Staff A works 12:00–17:00 (the admin-configured example from DESIGN.md)
  const noon5pm = [win(720, 1020)];

  it('generates slots on the step grid that fit the duration', () => {
    expect(computeStaffSlots(noon5pm, [], 60, 30)).toEqual([
      720, 750, 780, 810, 840, 870, 900, 930, 960, // last: 16:00 + 60min = 17:00 exactly
    ]);
  });

  it('excludes slots colliding with an existing booking', () => {
    const booked = [win(780, 840)]; // 13:00–14:00
    const slots = computeStaffSlots(noon5pm, booked, 60, 30);
    expect(slots).toEqual([720, 840, 870, 900, 930, 960]); // 12:30 would run into 13:00; 12:00 ends exactly at 13:00 → ok
  });

  it('subtracts time-off like any busy interval', () => {
    const timeOff = [win(720, 900)]; // off until 15:00
    expect(computeStaffSlots(noon5pm, timeOff, 60, 30)).toEqual([900, 930, 960]);
  });

  it('respects earliestStartMin (min-notice on today) and aligns to the global grid', () => {
    expect(computeStaffSlots(noon5pm, [], 60, 30, 745)).toEqual([750, 780, 810, 840, 870, 900, 930, 960]);
  });

  it('aligns off-grid window starts to the 00:00-based grid', () => {
    expect(computeStaffSlots([win(550, 700)], [], 30, 30)).toEqual([570, 600, 630, 660]); // 09:10 window → first slot 09:30
  });

  it('handles multiple windows and long durations', () => {
    const split = [win(540, 720), win(780, 1020)]; // 09–12 and 13–17
    expect(computeStaffSlots(split, [], 180, 60)).toEqual([540, 780, 840]); // 3h grooms
  });

  it('returns empty for nonsense input', () => {
    expect(computeStaffSlots(noon5pm, [], 0, 30)).toEqual([]);
    expect(computeStaffSlots([], [], 60, 30)).toEqual([]);
  });
});

describe('mergeStaffSlots', () => {
  it('unions staff per slot, sorted by time', () => {
    const merged = mergeStaffSlots([
      { staffId: 'b', slots: [780, 720] },
      { staffId: 'a', slots: [720] },
    ]);
    expect([...merged.entries()]).toEqual([
      [720, ['b', 'a']],
      [780, ['b']],
    ]);
  });
});

describe('pickStaff', () => {
  it('picks the least-loaded groomer', () => {
    const load = new Map([
      ['a', 3],
      ['b', 1],
    ]);
    expect(pickStaff(['a', 'b'], load)).toBe('b');
  });
  it('breaks ties deterministically by id', () => {
    expect(pickStaff(['b', 'a'], new Map())).toBe('a');
  });
  it('returns null when nobody is free', () => {
    expect(pickStaff([], new Map())).toBeNull();
  });
});
