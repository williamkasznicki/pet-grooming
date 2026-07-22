// Mirrors of the NestJS response DTOs (server/src/modules/<module>/dto). Keep in sync.

export type MasterDataItem = {
  id: number
  code: string
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
  active: boolean
  createdAt: string
  updatedAt: string
  tiers: ServiceTier[]
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
