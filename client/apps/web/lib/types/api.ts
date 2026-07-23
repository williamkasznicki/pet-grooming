// Mirrors of the NestJS response DTOs (server/src/modules/<module>/dto). Keep in sync.

export type MasterDataItem = {
  id: number
  code: string
  /** Weight band bounds (kg) — pet sizes only; null elsewhere. */
  minWeightKg: string | null
  maxWeightKg: string | null
  hexBgColorCode: string | null
  hexTextColorCode: string | null
  desc: string | null
  isActive: boolean
}

export type Pet = {
  id: string
  ownerId: string
  name: string
  breed: string | null
  /** Client-entered weight; sizeId is derived from it server-side. */
  weightKg: string | null
  sizeId: number
  birthDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ServiceTier = {
  id: string
  serviceId: string
  sizeId: number
  priceThb: string
  durationMin: number
}

export type Service = {
  id: string
  name: string
  description: string | null
  /** Thai display strings — fall back to name/description when null. */
  nameTh: string | null
  descriptionTh: string | null
  /** Preset icon key (lib/service-icons.tsx); null → name heuristic. */
  icon: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  tiers: ServiceTier[]
}

/** Locale-aware service display strings (th falls back to the English fields). */
export function serviceDisplay(service: Service, locale: string): { name: string; description: string | null } {
  if (locale === "th") {
    return { name: service.nameTh ?? service.name, description: service.descriptionTh ?? service.description }
  }
  return { name: service.name, description: service.description }
}

export type StaffPublic = {
  id: string
  displayName: string
}

export type AvailabilitySlot = {
  start: string
  end: string
  staffIds: string[]
}

export type Availability = {
  date: string
  timezone: string
  durationMin: number
  slots: AvailabilitySlot[]
}

/** GET /booking-rules — public projection of admin-editable ShopSettings. */
export type BookingRules = {
  timezone: string
  openMin: number
  closeMin: number
  slotStepMin: number
  minNoticeMin: number
  cancelCutoffHours: number
}

export type BookingStatusRef = {
  code: string
  hexBgColorCode: string | null
  hexTextColorCode: string | null
}

export type Booking = {
  id: string
  clientId: string
  clientName: string
  petId: string
  petName: string
  serviceId: string
  serviceName: string
  staffId: string
  staffName: string | null
  startsAt: string
  endsAt: string
  priceThb: string
  durationMin: number
  overridden: boolean
  status: BookingStatusRef
  paymentStatus: string
  notes: string | null
  createdAt: string
}
