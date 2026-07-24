"use client"

import { useEffect, useMemo, useReducer, useRef } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { api, apiErrorMessage } from "@/lib/api/client"
import { useAxios } from "@/hooks/useAxios"
import { useAuth } from "@/lib/auth/auth-context"
import type { Availability, MasterDataItem, Pet, Service, StaffPublic } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"
import { initialWizardState, wizardReducer } from "./bookingState"

/** Static reference data the wizard renders from (loaded once). */
export type Catalog = { services: Service[]; sizes: MasterDataItem[]; staff: StaffPublic[] }

/**
 * All wizard behavior in one hook — the page component is a pure view.
 * State transitions live in bookingState.ts; this layer adds data fetching
 * (SWR-style queries; page-critical ones throw into error.tsx) and the two
 * async flows (availability lookup, booking submission).
 */
export function useBookingWizard() {
  const t = useTranslations("book")
  const tc = useTranslations("common")
  const { user } = useAuth()

  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)

  const services = useAxios<Service[]>("/services", { throwOnError: true })
  const sizes = useAxios<MasterDataItem[]>("/master-data/pet-sizes", { throwOnError: true })
  const staff = useAxios<StaffPublic[]>("/staff", { throwOnError: true })
  // Conditional query: skipped (null key) until the session exists.
  const petsQuery = useAxios<Pet[]>(user ? "/pets" : null)

  const catalog: Catalog | null = useMemo(
    () =>
      services.data && sizes.data && staff.data
        ? { services: services.data, sizes: sizes.data, staff: staff.data }
        : null,
    [services.data, sizes.data, staff.data],
  )
  const pets = petsQuery.data ?? null

  // Event-driven (called from handlers, never an effect): keeps loading state
  // out of render and satisfies react-hooks/set-state-in-effect. Service/pet
  // can be passed explicitly (deep-link prefill fires before state settles).
  const loadAvailabilityFor = async (service: Service, pet: Pet, forDate: Date, forStaff: string) => {
    dispatch({ type: "slotsLoading" })
    try {
      const params = new URLSearchParams({
        serviceId: service.id,
        sizeId: String(pet.sizeId),
        date: toDateParam(forDate),
      })
      if (forStaff !== "any") params.set("staffId", forStaff)
      const res = await api.get<Availability>(`/availability?${params.toString()}`)
      dispatch({ type: "slotsLoaded", availability: res.data })
    } catch (err) {
      dispatch({ type: "slotsFailed", message: apiErrorMessage(err, tc("error")) })
    }
  }
  const loadAvailability = async (forDate: Date, forStaff: string) => {
    if (!state.service || !state.pet) return
    await loadAvailabilityFor(state.service, state.pet, forDate, forStaff)
  }

  // Deep-link prefill (AI assistant link): once catalog + pets are loaded and
  // the URL carries serviceId/petId, jump to the time step with them selected
  // and load availability. Runs exactly once (ref guard); reads external URL
  // state, so an init effect is the right tool.
  const searchParams = useSearchParams()
  const prefilled = useRef(false)
  const desiredStart = useRef<string | null>(null)
  useEffect(() => {
    if (prefilled.current || !catalog || pets === null) return
    const serviceId = searchParams.get("serviceId")
    const petId = searchParams.get("petId")
    if (!serviceId || !petId) {
      prefilled.current = true
      return
    }
    const service = catalog.services.find((candidate) => candidate.id === serviceId)
    const pet = pets.find((candidate) => candidate.id === petId)
    prefilled.current = true
    if (!service || !pet) return
    const dateParam = searchParams.get("date")
    const date = dateParam ? new Date(`${dateParam}T00:00:00`) : undefined
    desiredStart.current = searchParams.get("start")
    dispatch({ type: "prefill", service, pet, date })
    if (date) void loadAvailabilityFor(service, pet, date, "any")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, pets])

  // After prefilled availability arrives, auto-select the requested slot.
  useEffect(() => {
    if (!desiredStart.current || !state.availability) return
    const match = state.availability.slots.find((slot) => slot.start === desiredStart.current)
    desiredStart.current = null
    if (match) dispatch({ type: "selectSlot", slot: match })
  }, [state.availability])

  // Slot hold (TTL): while the client sits on the confirm step, reserve the
  // groomer+time server-side so a second person can't reach confirm for the
  // same slot. The hold expires on its own; we also release it on leaving
  // confirm and on unmount. The reservation is a courtesy — the serializable
  // create is still the real double-booking guard.
  const hold = useRef<{ id: string; staffId: string; start: string } | null>(null)
  const releaseHold = async () => {
    const current = hold.current
    hold.current = null
    if (current) await api.delete(`/bookings/holds/${current.id}`).catch(() => undefined)
  }

  useEffect(() => {
    if (state.step !== "confirm" || !state.slot || !state.service || !state.pet) {
      void releaseHold()
      return
    }
    if (hold.current?.start === state.slot.start) return
    const { service, pet, slot, staffFilter } = state
    let cancelled = false
    void (async () => {
      await releaseHold()
      try {
        const res = await api.post<{ id: string; staffId: string }>("/bookings/holds", {
          serviceId: service.id,
          petId: pet.id,
          startsAt: slot.start,
          ...(staffFilter !== "any" ? { staffId: staffFilter } : {}),
        })
        if (cancelled) {
          await api.delete(`/bookings/holds/${res.data.id}`).catch(() => undefined)
          return
        }
        hold.current = { id: res.data.id, staffId: res.data.staffId, start: slot.start }
      } catch (err) {
        // 409 = someone already holds it; bounce back to the grid. Other errors
        // are non-fatal — the confirm request will re-check availability.
        if ((err as { response?: { status?: number } }).response?.status === 409) {
          dispatch({ type: "submitConflicted", message: apiErrorMessage(err, t("slotTaken")) })
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.slot?.start])

  // Release on unmount (navigating away without confirming or cancelling).
  useEffect(() => {
    return () => {
      void releaseHold()
    }
  }, [])

  const confirmBooking = async () => {
    if (!state.service || !state.pet || !state.slot) return
    const { service, pet, slot, staffFilter, date } = state
    // Book the exact groomer we reserved (resolves "any" to the held one).
    const heldStaffId = hold.current?.start === slot.start ? hold.current.staffId : undefined
    const staffId = heldStaffId ?? (staffFilter !== "any" ? staffFilter : undefined)
    dispatch({ type: "submitStart" })
    try {
      const res = await api.post<{ id: string }>("/bookings", {
        serviceId: service.id,
        petId: pet.id,
        startsAt: slot.start,
        ...(staffId ? { staffId } : {}),
      })
      hold.current = null // create consumed our hold server-side
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
