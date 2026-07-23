"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { useAxios } from "@/hooks/useAxios"
import type { Booking, BookingRules } from "@/lib/types/api"
import { formatMinutesOfDay } from "@/lib/utils/date"

/*
 * Today's schedule as a per-groomer timeline (replaces the flat table — with
 * several parallel bookings a time grid reads at a glance). Hour rows span
 * the shop's operating window from GET /booking-rules; blocks are positioned
 * by start/duration and colored by the booking's master-data status colors.
 * Cancelled/no-show bookings stay visible but fade, so gaps are explained.
 */

const PX_PER_HOUR = 56
const FADED_STATUSES = new Set(["CANCELLED", "NO_SHOW"])

type Lane = { staffName: string; bookings: Booking[] }

function minutesOfDay(iso: string): number {
  const date = new Date(iso)
  return date.getHours() * 60 + date.getMinutes()
}

export function TodayTimeline({ bookings }: { bookings: Booking[] }) {
  const t = useTranslations("admin.dashboard")
  const format = useFormatter()
  const { data: rules } = useAxios<BookingRules>("/booking-rules")

  const openMin = rules?.openMin ?? 9 * 60
  const closeMin = rules?.closeMin ?? 18 * 60
  const totalMin = Math.max(closeMin - openMin, 60)
  const bodyHeight = (totalMin / 60) * PX_PER_HOUR

  const lanes = useMemo<Lane[]>(() => {
    const byStaff = new Map<string, Booking[]>()
    for (const booking of bookings) {
      const key = booking.staffName ?? "—"
      byStaff.set(key, [...(byStaff.get(key) ?? []), booking])
    }
    return [...byStaff.entries()]
      .map(([staffName, items]) => ({ staffName, bookings: items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }))
      .sort((a, b) => a.staffName.localeCompare(b.staffName))
  }, [bookings])

  if (bookings.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noBookings")}</p>
  }

  const hourMarks: number[] = []
  for (let minute = openMin; minute <= closeMin; minute += 60) hourMarks.push(minute)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[32rem]">
        {/* Lane headers */}
        <div className="flex border-b pb-2">
          <div className="w-14 shrink-0" />
          {lanes.map((lane) => (
            <p key={lane.staffName} className="flex-1 px-2 text-sm font-semibold">
              {lane.staffName}
            </p>
          ))}
        </div>

        <div className="relative flex" style={{ height: bodyHeight }}>
          {/* Hour gridlines + labels */}
          {hourMarks.map((minute) => (
            <div
              key={minute}
              className="border-border/60 absolute inset-x-0 border-t"
              style={{ top: ((minute - openMin) / totalMin) * bodyHeight }}
              aria-hidden
            >
              <span className="text-muted-foreground bg-card pr-1 text-[10px] tabular-nums">
                {formatMinutesOfDay(minute)}
              </span>
            </div>
          ))}

          <div className="w-14 shrink-0" />
          {lanes.map((lane) => (
            <div key={lane.staffName} className="border-border/40 relative flex-1 border-l">
              {lane.bookings.map((booking) => {
                const start = Math.max(minutesOfDay(booking.startsAt), openMin)
                const end = Math.min(minutesOfDay(booking.endsAt), closeMin)
                if (end <= start) return null
                const faded = FADED_STATUSES.has(booking.status.code)
                return (
                  <div
                    key={booking.id}
                    className="absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-xs shadow-sm"
                    style={{
                      top: ((start - openMin) / totalMin) * bodyHeight + 1,
                      height: Math.max(((end - start) / totalMin) * bodyHeight - 2, 22),
                      backgroundColor: booking.status.hexBgColorCode ?? "var(--secondary)",
                      color: booking.status.hexTextColorCode ?? "var(--secondary-foreground)",
                      opacity: faded ? 0.45 : 1,
                    }}
                    title={`${format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })} · ${booking.serviceName} — ${booking.petName} (${booking.clientName}) · ${booking.status.code}`}
                  >
                    <p className={faded ? "truncate font-medium line-through" : "truncate font-medium"}>
                      {format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })} ·{" "}
                      {booking.petName}
                    </p>
                    <p className="truncate opacity-80">{booking.serviceName}</p>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
