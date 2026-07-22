"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import type { Availability, AvailabilitySlot, MasterDataItem, Pet, Service, StaffPublic } from "@/lib/types/api"

const MAX_DAYS_AHEAD = 30

// Module scope: evaluated once at load, outside render (react-hooks/purity).
// Staleness is irrelevant — the server enforces min-notice on every request.
const DATE_BOUNDS = {
  before: new Date(),
  after: new Date(Date.now() + MAX_DAYS_AHEAD * 86_400_000),
}

type Step = "service" | "pet" | "time" | "confirm"
const STEP_ORDER: Step[] = ["service", "pet", "time", "confirm"]

/** yyyy-MM-dd in the browser's local calendar (shop timezone differences are handled server-side). */
function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function BookPage() {
  const t = useTranslations("book")
  const tc = useTranslations("common")
  const tn = useTranslations("nav")
  const format = useFormatter()
  const { user } = useAuth()

  // Wizard selections
  const [step, setStep] = useState<Step>("service")
  const [service, setService] = useState<Service | null>(null)
  const [pet, setPet] = useState<Pet | null>(null)
  const [date, setDate] = useState<Date | undefined>()
  const [staffFilter, setStaffFilter] = useState<string>("any")
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null)

  // Data
  const [services, setServices] = useState<Service[] | null>(null)
  const [sizes, setSizes] = useState<MasterDataItem[]>([])
  const [staff, setStaff] = useState<StaffPublic[]>([])
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookedId, setBookedId] = useState<string | null>(null)

  useEffect(() => {
    void api.get<Service[]>("/services").then((res) => setServices(res.data))
    void api.get<MasterDataItem[]>("/master-data/pet-sizes").then((res) => setSizes(res.data))
    void api.get<StaffPublic[]>("/staff").then((res) => setStaff(res.data))
  }, [])

  useEffect(() => {
    if (user) void api.get<Pet[]>("/pets").then((res) => setPets(res.data))
  }, [user])

  // Event-driven (not an effect): called from date/groomer handlers and the
  // 409 retry path, so loading state never sets synchronously during render.
  const loadAvailability = useCallback(
    async (forDate: Date, forStaff: string) => {
      if (!service || !pet) return
      setLoadingSlots(true)
      setSlot(null)
      setError(null)
      try {
        const params = new URLSearchParams({
          serviceId: service.id,
          sizeId: String(pet.sizeId),
          date: toDateParam(forDate),
        })
        if (forStaff !== "any") params.set("staffId", forStaff)
        const res = await api.get<Availability>(`/availability?${params.toString()}`)
        setAvailability(res.data)
      } catch (err) {
        setError(apiErrorMessage(err, tc("error")))
        setAvailability(null)
      } finally {
        setLoadingSlots(false)
      }
    },
    [service, pet, tc],
  )

  const tier = useMemo(
    () => (service && pet ? service.tiers.find((candidate) => candidate.sizeId === pet.sizeId) : undefined),
    [service, pet],
  )
  const sizeOf = (sizeId: number) => sizes.find((size) => size.id === sizeId)

  const confirmBooking = async () => {
    if (!service || !pet || !slot) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ id: string }>("/bookings", {
        serviceId: service.id,
        petId: pet.id,
        startsAt: slot.start,
        ...(staffFilter !== "any" ? { staffId: staffFilter } : {}),
      })
      setBookedId(res.data.id)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        // Slot got taken between selection and confirm — send them back to pick again.
        setError(t("slotTaken"))
        setStep("time")
        if (date) void loadAvailability(date, staffFilter)
      } else {
        setError(apiErrorMessage(err, tc("error")))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (bookedId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="text-2xl font-semibold text-balance">{t("success")}</h1>
        <Button render={<Link href="/bookings" />}>{t("viewBookings")}</Button>
      </div>
    )
  }

  const stepIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">{t("title")}</h1>

      {/* Step indicator */}
      <ol className="mb-8 flex gap-2 text-xs">
        {STEP_ORDER.map((name, index) => (
          <li
            key={name}
            className={cn(
              "flex-1 border-b-2 pb-2 font-medium",
              index <= stepIndex ? "border-primary text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {index + 1}. {t(`step${name.charAt(0).toUpperCase()}${name.slice(1)}` as Parameters<typeof t>[0])}
          </li>
        ))}
      </ol>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* Step 1 — service */}
      {step === "service" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {services === null
            ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
            : services.map((candidate) => (
                <Card
                  key={candidate.id}
                  className={cn("cursor-pointer transition-colors", service?.id === candidate.id && "border-primary")}
                  onClick={() => {
                    setService(candidate)
                    setStep("pet")
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{candidate.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {candidate.description}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.tiers.map((tierOption) => {
                        const size = sizeOf(tierOption.sizeId)
                        return (
                          <Badge
                            key={tierOption.id}
                            variant="secondary"
                            style={
                              size?.hexBgColorCode
                                ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                                : undefined
                            }
                          >
                            {size?.code} ฿{Number(tierOption.priceThb)}
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Step 2 — pet */}
      {step === "pet" && (
        <div className="flex flex-col gap-3">
          {!user && (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <p>{t("loginRequired")}</p>
                <Button render={<Link href="/login?next=/book" />}>{tn("login")}</Button>
              </CardContent>
            </Card>
          )}
          {user && pets !== null && pets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <p>{t("noPets")}</p>
                <Button render={<Link href="/pets" />}>{t("addPet")}</Button>
              </CardContent>
            </Card>
          )}
          {user &&
            (pets ?? []).map((candidate) => {
              const size = sizeOf(candidate.sizeId)
              return (
                <Card
                  key={candidate.id}
                  className={cn("cursor-pointer transition-colors", pet?.id === candidate.id && "border-primary")}
                  onClick={() => {
                    setPet(candidate)
                    setStep("time")
                  }}
                >
                  <CardContent className="flex items-center justify-between gap-3 pt-6">
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      {candidate.breed && <p className="text-muted-foreground text-sm">{candidate.breed}</p>}
                    </div>
                    {size && (
                      <Badge
                        style={
                          size.hexBgColorCode
                            ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                            : undefined
                        }
                      >
                        {size.code}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setStep("service")}>
            ← {tc("back")}
          </Button>
        </div>
      )}

      {/* Step 3 — date & slot */}
      {step === "time" && service && pet && (
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selected) => {
                setDate(selected)
                if (selected) void loadAvailability(selected, staffFilter)
              }}
              disabled={DATE_BOUNDS}
            />
            <Select
              value={staffFilter}
              onValueChange={(value) => {
                const nextStaff = (value as string | null) ?? "any"
                setStaffFilter(nextStaff)
                if (date) void loadAvailability(date, nextStaff)
              }}
            >
              <SelectTrigger aria-label={t("groomer")}>
                {/* Explicit label: Base UI only learns item labels after the popup first mounts */}
                <SelectValue>
                  {staffFilter === "any"
                    ? t("anyGroomer")
                    : (staff.find((member) => member.id === staffFilter)?.displayName ?? t("groomer"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyGroomer")}</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            {tier && (
              <p className="text-muted-foreground mb-3 text-sm">
                {service.name} · {t("duration", { minutes: tier.durationMin })} · ฿{Number(tier.priceThb)}
              </p>
            )}
            {loadingSlots && <Skeleton className="h-40" />}
            {!loadingSlots && date && availability && availability.slots.length === 0 && (
              <p className="text-muted-foreground text-sm">{t("noSlots")}</p>
            )}
            {!loadingSlots && availability && availability.slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availability.slots.map((candidate) => (
                  <Button
                    key={candidate.start}
                    variant={slot?.start === candidate.start ? "default" : "outline"}
                    onClick={() => {
                      setSlot(candidate)
                      setStep("confirm")
                    }}
                  >
                    {format.dateTime(new Date(candidate.start), { hour: "2-digit", minute: "2-digit" })}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {step === "time" && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setStep("pet")}>
          ← {tc("back")}
        </Button>
      )}

      {/* Step 4 — confirm */}
      {step === "confirm" && service && pet && slot && tier && (
        <Card>
          <CardHeader>
            <CardTitle>{t("confirmTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              {service.name} — {pet.name}
            </p>
            <p>{format.dateTime(new Date(slot.start), { dateStyle: "full", timeStyle: "short" })}</p>
            <p className="text-muted-foreground">
              {t("duration", { minutes: tier.durationMin })} · ฿{Number(tier.priceThb)} ·{" "}
              {staffFilter === "any"
                ? t("anyGroomer")
                : (staff.find((member) => member.id === staffFilter)?.displayName ?? t("groomer"))}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void confirmBooking()} disabled={submitting}>
                {submitting ? tc("loading") : t("confirmCta")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("time")} disabled={submitting}>
                ← {tc("back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
