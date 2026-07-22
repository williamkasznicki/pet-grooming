"use client"

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
import type { MasterDataItem } from "@/lib/types/api"
import { useBookingWizard } from "./use-booking-wizard"
import { DATE_BOUNDS, STEP_ORDER } from "./wizard-state"

function SizeBadge({ size, children }: { size: MasterDataItem | undefined; children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      style={
        size?.hexBgColorCode
          ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
          : undefined
      }
    >
      {children}
    </Badge>
  )
}

export default function BookPage() {
  const t = useTranslations("book")
  const tc = useTranslations("common")
  const tn = useTranslations("nav")
  const format = useFormatter()

  const { state, dispatch, catalog, pets, user, tier, sizeOf, staffNameOf, loadAvailability, confirmBooking } =
    useBookingWizard()

  if (state.bookedId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="text-2xl font-semibold text-balance">{t("success")}</h1>
        <Button render={<Link href="/bookings" />}>{t("viewBookings")}</Button>
      </div>
    )
  }

  const stepIndex = STEP_ORDER.indexOf(state.step)
  const groomerLabel =
    state.staffFilter === "any" ? t("anyGroomer") : (staffNameOf(state.staffFilter) ?? t("groomer"))

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

      {state.error && <p className="text-destructive mb-4 text-sm">{state.error}</p>}

      {/* Step 1 — service */}
      {state.step === "service" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog === null
            ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
            : catalog.services.map((candidate) => (
                <Card
                  key={candidate.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    state.service?.id === candidate.id && "border-primary",
                  )}
                  onClick={() => dispatch({ type: "selectService", service: candidate })}
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
                          <SizeBadge key={tierOption.id} size={size}>
                            {size?.code} ฿{Number(tierOption.priceThb)}
                          </SizeBadge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Step 2 — pet */}
      {state.step === "pet" && (
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
                  className={cn(
                    "cursor-pointer transition-colors",
                    state.pet?.id === candidate.id && "border-primary",
                  )}
                  onClick={() => dispatch({ type: "selectPet", pet: candidate })}
                >
                  <CardContent className="flex items-center justify-between gap-3 pt-6">
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      {candidate.breed && <p className="text-muted-foreground text-sm">{candidate.breed}</p>}
                    </div>
                    {size && <SizeBadge size={size}>{size.code}</SizeBadge>}
                  </CardContent>
                </Card>
              )
            })}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => dispatch({ type: "back", to: "service" })}
          >
            ← {tc("back")}
          </Button>
        </div>
      )}

      {/* Step 3 — date & slot */}
      {state.step === "time" && state.service && state.pet && (
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={state.date}
              onSelect={(selected) => {
                dispatch({ type: "pickDate", date: selected })
                if (selected) void loadAvailability(selected, state.staffFilter)
              }}
              disabled={DATE_BOUNDS}
            />
            <Select
              value={state.staffFilter}
              onValueChange={(value) => {
                const nextStaff = (value as string | null) ?? "any"
                dispatch({ type: "setStaffFilter", staffId: nextStaff })
                if (state.date) void loadAvailability(state.date, nextStaff)
              }}
            >
              <SelectTrigger aria-label={t("groomer")}>
                {/* Explicit label: Base UI only learns item labels after the popup first mounts */}
                <SelectValue>{groomerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyGroomer")}</SelectItem>
                {(catalog?.staff ?? []).map((member) => (
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
                {state.service.name} · {t("duration", { minutes: tier.durationMin })} · ฿{Number(tier.priceThb)}
              </p>
            )}
            {state.loadingSlots && <Skeleton className="h-40" />}
            {!state.loadingSlots && state.date && state.availability && state.availability.slots.length === 0 && (
              <p className="text-muted-foreground text-sm">{t("noSlots")}</p>
            )}
            {!state.loadingSlots && state.availability && state.availability.slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {state.availability.slots.map((candidate) => (
                  <Button
                    key={candidate.start}
                    variant={state.slot?.start === candidate.start ? "default" : "outline"}
                    onClick={() => dispatch({ type: "selectSlot", slot: candidate })}
                  >
                    {format.dateTime(new Date(candidate.start), { hour: "2-digit", minute: "2-digit" })}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {state.step === "time" && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => dispatch({ type: "back", to: "pet" })}>
          ← {tc("back")}
        </Button>
      )}

      {/* Step 4 — confirm */}
      {state.step === "confirm" && state.service && state.pet && state.slot && tier && (
        <Card>
          <CardHeader>
            <CardTitle>{t("confirmTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              {state.service.name} — {state.pet.name}
            </p>
            <p>{format.dateTime(new Date(state.slot.start), { dateStyle: "full", timeStyle: "short" })}</p>
            <p className="text-muted-foreground">
              {t("duration", { minutes: tier.durationMin })} · ฿{Number(tier.priceThb)} · {groomerLabel}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void confirmBooking()} disabled={state.submitting}>
                {state.submitting ? tc("loading") : t("confirmCta")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "back", to: "time" })}
                disabled={state.submitting}
              >
                ← {tc("back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
