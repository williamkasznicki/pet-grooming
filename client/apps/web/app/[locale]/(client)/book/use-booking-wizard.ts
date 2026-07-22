"use client"

import { useMemo, useReducer } from "react"
import { useTranslations } from "next-intl"

import { api, apiErrorMessage } from "@/lib/api/client"
import { useApiQuery } from "@/lib/api/use-api-query"
import { useAuth } from "@/lib/auth/auth-context"
import type { Availability, MasterDataItem, Pet, Service, StaffPublic } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"
import { initialWizardState, wizardReducer } from "./wizard-state"

/** Static reference data the wizard renders from (loaded once). */
export type Catalog = { services: Service[]; sizes: MasterDataItem[]; staff: StaffPublic[] }

/**
 * All wizard behavior in one hook — the page component is a pure view.
 * State transitions live in wizard-state.ts; this layer adds data fetching
 * (SWR-style queries; page-critical ones throw into error.tsx) and the two
 * async flows (availability lookup, booking submission).
 */
export function useBookingWizard() {
  const t = useTranslations("book")
  const tc = useTranslations("common")
  const { user } = useAuth()

  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)

  const services = useApiQuery<Service[]>("/services", { throwOnError: true })
  const sizes = useApiQuery<MasterDataItem[]>("/master-data/pet-sizes", { throwOnError: true })
  const staff = useApiQuery<StaffPublic[]>("/staff", { throwOnError: true })
  // Conditional query: skipped (null key) until the session exists.
  const petsQuery = useApiQuery<Pet[]>(user ? "/pets" : null)

  const catalog: Catalog | null = useMemo(
    () =>
      services.data && sizes.data && staff.data
        ? { services: services.data, sizes: sizes.data, staff: staff.data }
        : null,
    [services.data, sizes.data, staff.data],
  )
  const pets = petsQuery.data ?? null

  // Event-driven (called from handlers, never an effect): keeps loading state
  // out of render and satisfies react-hooks/set-state-in-effect.
  const loadAvailability = async (forDate: Date, forStaff: string) => {
    if (!state.service || !state.pet) return
    dispatch({ type: "slotsLoading" })
    try {
      const params = new URLSearchParams({
        serviceId: state.service.id,
        sizeId: String(state.pet.sizeId),
        date: toDateParam(forDate),
      })
      if (forStaff !== "any") params.set("staffId", forStaff)
      const res = await api.get<Availability>(`/availability?${params.toString()}`)
      dispatch({ type: "slotsLoaded", availability: res.data })
    } catch (err) {
      dispatch({ type: "slotsFailed", message: apiErrorMessage(err, tc("error")) })
    }
  }

  const confirmBooking = async () => {
    if (!state.service || !state.pet || !state.slot) return
    const { service, pet, slot, staffFilter, date } = state
    dispatch({ type: "submitStart" })
    try {
      const res = await api.post<{ id: string }>("/bookings", {
        serviceId: service.id,
        petId: pet.id,
        startsAt: slot.start,
        ...(staffFilter !== "any" ? { staffId: staffFilter } : {}),
      })
      dispatch({ type: "submitSucceeded", bookingId: res.data.id })
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        dispatch({ type: "submitConflicted", message: t("slotTaken") })
        if (date) void loadAvailability(date, staffFilter)
      } else {
        dispatch({ type: "submitFailed", message: apiErrorMessage(err, tc("error")) })
      }
    }
  }

  const tier = useMemo(
    () =>
      state.service && state.pet
        ? state.service.tiers.find((candidate) => candidate.sizeId === state.pet?.sizeId)
        : undefined,
    [state.service, state.pet],
  )

  const sizeOf = (sizeId: number) => catalog?.sizes.find((size) => size.id === sizeId)
  const staffNameOf = (staffId: string) => catalog?.staff.find((member) => member.id === staffId)?.displayName

  return { state, dispatch, catalog, pets, user, tier, sizeOf, staffNameOf, loadAvailability, confirmBooking }
}
