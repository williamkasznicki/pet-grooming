/**
 * Typed view over the ShopSetting rows that drive scheduling/booking rules.
 * Single source of truth for keys, defaults, and parsing — imported by the
 * availability engine and (soon) the booking module. Values remain
 * admin-editable at runtime via /shop-settings; defaults only fill gaps.
 */

export type ShopOperatingSettings = {
  /** IANA timezone the shop operates in (key: shop.timezone). */
  timezone: string;
  /** Shop opening, minutes from midnight shop-local (key: shop.hours → openMin). */
  openMin: number;
  /** Shop closing, minutes from midnight shop-local (key: shop.hours → closeMin). */
  closeMin: number;
  /** Slot grid step in minutes (key: booking.slotStepMin). */
  slotStepMin: number;
  /** Minimum notice before a booking may start (key: booking.minNoticeMin). */
  minNoticeMin: number;
  /** Hours before start until a client may cancel (key: booking.cancelCutoffHours). */
  cancelCutoffHours: number;
  /** Reminder email lead time in hours (key: reminder.hoursBefore). */
  reminderHoursBefore: number;
};

export const OPERATING_SETTING_KEYS = [
  'shop.timezone',
  'shop.hours',
  'booking.slotStepMin',
  'booking.minNoticeMin',
  'booking.cancelCutoffHours',
  'reminder.hoursBefore',
] as const;

export const DEFAULT_OPERATING_SETTINGS: ShopOperatingSettings = {
  timezone: 'Asia/Bangkok',
  openMin: 9 * 60,
  closeMin: 18 * 60,
  slotStepMin: 30,
  minNoticeMin: 60,
  cancelCutoffHours: 24,
  reminderHoursBefore: 24,
};

type SettingRow = { key: string; value: unknown };

/** Merge raw ShopSetting rows over the defaults. Unknown/malformed values fall back per-field. */
export function parseOperatingSettings(rows: SettingRow[]): ShopOperatingSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const num = (key: string, fallback: number): number => {
    const value = byKey.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };

  const hours = byKey.get('shop.hours') as { openMin?: number; closeMin?: number } | undefined;
  const timezone = byKey.get('shop.timezone');

  return {
    timezone: typeof timezone === 'string' && timezone.length > 0 ? timezone : DEFAULT_OPERATING_SETTINGS.timezone,
    openMin: typeof hours?.openMin === 'number' ? hours.openMin : DEFAULT_OPERATING_SETTINGS.openMin,
    closeMin: typeof hours?.closeMin === 'number' ? hours.closeMin : DEFAULT_OPERATING_SETTINGS.closeMin,
    slotStepMin: num('booking.slotStepMin', DEFAULT_OPERATING_SETTINGS.slotStepMin),
    minNoticeMin: num('booking.minNoticeMin', DEFAULT_OPERATING_SETTINGS.minNoticeMin),
    cancelCutoffHours: num('booking.cancelCutoffHours', DEFAULT_OPERATING_SETTINGS.cancelCutoffHours),
    reminderHoursBefore: num('reminder.hoursBefore', DEFAULT_OPERATING_SETTINGS.reminderHoursBefore),
  };
}
