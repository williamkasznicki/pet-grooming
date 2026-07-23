/**
 * ตรรกะคำนวณคิวว่าง (pure function ทั้งไฟล์ — ไม่มี I/O, ไม่มี Date)
 * ทุกค่าคือ "นาทีนับจากเที่ยงคืน" ตามเวลาท้องถิ่นของร้าน เช่น 09:00 = 540
 * ชั้น service (availability.service.ts) เป็นคนแปลงข้อมูลจาก DB มาเป็นนาที
 * และแปลงผลลัพธ์กลับเป็นเวลา ISO — ไฟล์นี้จึงเทสง่าย (availability.logic.spec.ts)
 */

/** ช่วงเวลาแบบครึ่งเปิด [startMin, endMin) หน่วยนาที เช่น 09:00–10:00 = { startMin: 540, endMin: 600 } */
export type MinuteInterval = { startMin: number; endMin: number };

/**
 * ตัดช่วงเวลาให้อยู่ในกรอบ bounds — เหลือแค่ส่วนที่ซ้อนกัน
 * ตัวอย่าง: clampInterval({540,720}, {600,1080}) → {600,720}   (ตัดหัวที่เกินกรอบทิ้ง)
 * ตัวอย่าง: clampInterval({540,600}, {600,1080}) → null        (ไม่ซ้อนกันเลย)
 */
export function clampInterval ( interval: MinuteInterval, bounds: MinuteInterval ): MinuteInterval | null {
  const startMin = Math.max( interval.startMin, bounds.startMin );
  const endMin = Math.min( interval.endMin, bounds.endMin );
  return startMin < endMin ? { startMin, endMin } : null;
}

/**
 * สองช่วงเวลาซ้อนกันไหม
 * ตัวอย่าง: overlaps({540,600}, {590,660}) → true   (ซ้อนช่วง 590–600)
 * ตัวอย่าง: overlaps({540,600}, {600,660}) → false  (ชนพอดีไม่นับว่าซ้อน)
 */
export function overlaps ( a: MinuteInterval, b: MinuteInterval ): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * เรียงช่วงเวลาแล้วรวมช่วงที่ซ้อน/ติดกันให้เป็นก้อนเดียว — O(n log n)
 * ผลลัพธ์เรียงจากน้อยไปมากและไม่ซ้อนกันแน่นอน
 * ตัวอย่าง: mergeIntervals([{600,660}, {540,610}]) → [{540,660}]
 * ตัวอย่าง: mergeIntervals([{540,600}, {720,780}]) → [{540,600}, {720,780}]  (ห่างกัน ไม่รวม)
 */
export function mergeIntervals ( intervals: MinuteInterval[] ): MinuteInterval[] {
  if ( intervals.length <= 1 ) return [ ...intervals ];

  const sortedByStart = [ ...intervals ].sort( ( a, b ) => a.startMin - b.startMin );
  const mergedResult: MinuteInterval[] = [ { ...sortedByStart[ 0 ] } ];

  for ( let i = 1; i < sortedByStart.length; i++ ) {
    const lastMerged = mergedResult[ mergedResult.length - 1 ];
    if ( sortedByStart[ i ].startMin <= lastMerged.endMin ) {
      // ช่วงนี้ซ้อน/ติดกับก้อนล่าสุด → ขยายก้อนล่าสุดออกไป
      lastMerged.endMin = Math.max( lastMerged.endMin, sortedByStart[ i ].endMin );
    } else {
      // ช่วงนี้ห่างออกไป → เริ่มก้อนใหม่
      mergedResult.push( { ...sortedByStart[ i ] } );
    }
  }
  return mergedResult;
}

/**
 * หา "เวลาเริ่มคิว" ทั้งหมดของช่างหนึ่งคนในหนึ่งวัน
 *
 * พารามิเตอร์ (ตัวเลขทั้งหมดคือนาทีนับจากเที่ยงคืน):
 * @param workingWindows ช่วงเวลาทำงานที่แอดมินตั้งไว้ เช่น [{540,1080}] = ทำงาน 09:00–18:00
 * @param busy           ช่วงที่ไม่ว่าง (คิวจอง + วันลา) เช่น [{600,660}] = ติดคิว 10:00–11:00
 * @param durationMin    บริการใช้เวลากี่นาที เช่น 60
 * @param stepMin        ตารางคิวเว้นช่วงทีละกี่นาที (setting booking.slotStepMin) เช่น 30
 * @param earliestStartMin ห้ามเริ่มก่อนเวลานี้ (วันนี้ = ตอนนี้ + เวลาจองล่วงหน้าขั้นต่ำ, วันอื่น = 0)
 * @returns รายการนาทีที่เริ่มคิวได้ เรียงแล้วและไม่ซ้ำ
 *
 * ตัวอย่าง: computeStaffSlots([{540,720}], [{600,660}], 60, 30) → [540, 660]
 *   ทำงาน 09:00–12:00, ติดคิว 10:00–11:00, บริการ 60 นาที, step 30
 *   → เริ่มได้ 09:00 (จบ 10:00 พอดี) กับ 11:00 (จบ 12:00 พอดี)
 *   ส่วน 09:30/10:00/10:30 ชนคิว 10:00–11:00 และ 11:30 จบ 12:30 เกินเวลาทำงาน
 *
 * ความเร็ว: O(W log W + B log B + S) — เรียงสองรายการครั้งเดียว แล้วเดินตัวชี้ busy
 * ไปข้างหน้าอย่างเดียว ไม่วนซ้ำต่อ candidate (S = จำนวนคิวที่ตอบออกไป ซึ่งเป็นขั้นต่ำ
 * ของทุกอัลกอริทึมที่ถูกต้องอยู่แล้ว)
 */
export function computeStaffSlots (
  workingWindows: MinuteInterval[],
  busy: MinuteInterval[],
  durationMin: number,
  stepMin: number,
  earliestStartMin = 0,
): number[] {
  if ( durationMin <= 0 || stepMin <= 0 ) return [];

  // รวมช่วงก่อน → ได้รายการที่เรียงและไม่ซ้อนกัน ทำให้ผลลัพธ์เรียง/ไม่ซ้ำโดยอัตโนมัติ
  const windows = mergeIntervals( workingWindows );
  const busyMerged = mergeIntervals( busy );

  const slotStarts: number[] = [];
  let busyIndex = 0; // ตัวชี้เดินหน้าอย่างเดียว — ใช้ข้ามทุก window ได้เพราะทั้งสองรายการเรียงแล้ว

  for ( const window of windows ) {
    // จัดเวลาเริ่มให้ตรง "ตาราง step จากเที่ยงคืน" ไม่ใช่จากต้น window
    // เช่น ทำงาน 09:10–17:00 step 30 → คิวแรกคือ 09:30 ไม่ใช่ 09:10
    let slotStart = Math.max( window.startMin, earliestStartMin );
    slotStart = Math.ceil( slotStart / stepMin ) * stepMin;

    for ( ; slotStart + durationMin <= window.endMin; slotStart += stepMin ) {
      const slotEnd = slotStart + durationMin;

      // ข้ามช่วง busy ที่จบก่อนคิวนี้เริ่ม (ไม่เกี่ยวแล้ว ไม่ต้องดูอีก)
      while ( busyIndex < busyMerged.length && busyMerged[ busyIndex ].endMin <= slotStart ) busyIndex++;

      // busy เรียงและไม่ซ้อนกัน → มีแค่ก้อนปัจจุบันก้อนเดียวที่อาจชนคิวนี้
      const noConflict = busyIndex >= busyMerged.length || busyMerged[ busyIndex ].startMin >= slotEnd;
      if ( noConflict ) slotStarts.push( slotStart );
    }
  }
  return slotStarts;
}

/**
 * รวมคิวว่างของช่างหลายคนเป็น Map: เวลาเริ่ม → รายชื่อ staffId ที่ว่าง (เรียงตามเวลา)
 * ตัวอย่าง: mergeStaffSlots([{staffId:"a", slots:[540,600]}, {staffId:"b", slots:[600]}])
 *   → Map { 540 → ["a"], 600 → ["a","b"] }
 */
export function mergeStaffSlots ( perStaff: { staffId: string; slots: number[] }[] ): Map<number, string[]> {
  const slotToStaffIds = new Map<number, string[]>();
  for ( const { staffId, slots } of perStaff ) {
    for ( const slot of slots ) {
      const staffIds = slotToStaffIds.get( slot ) ?? [];
      staffIds.push( staffId );
      slotToStaffIds.set( slot, staffIds );
    }
  }
  return new Map( [ ...slotToStaffIds.entries() ].sort( ( [ a ], [ b ] ) => a - b ) );
}

/**
 * เลือกช่างให้อัตโนมัติเมื่อลูกค้าเลือก "ช่างคนไหนก็ได้" (docs/DESIGN.md)
 * กติกา: เลือกคนที่วันนั้นมีคิวน้อยที่สุด ถ้าเท่ากันเรียงตาม id เพื่อให้ผลคงที่ทุกครั้ง
 * ตัวอย่าง: pickStaff(["b","a"], Map{a→2, b→1}) → "b"   (b มีแค่ 1 คิว)
 * ตัวอย่าง: pickStaff([], Map{}) → null                  (ไม่มีใครว่าง)
 */
export function pickStaff ( freeStaffIds: string[], bookingsCountByStaff: Map<string, number> ): string | null {
  if ( freeStaffIds.length === 0 ) return null;
  return [ ...freeStaffIds ].sort( ( a, b ) => {
    const loadDiff = ( bookingsCountByStaff.get( a ) ?? 0 ) - ( bookingsCountByStaff.get( b ) ?? 0 );
    return loadDiff !== 0 ? loadDiff : a.localeCompare( b );
  } )[ 0 ];
}
