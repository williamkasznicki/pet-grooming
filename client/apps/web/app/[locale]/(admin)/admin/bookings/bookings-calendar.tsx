"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

import { useAxios } from "@/hooks/useAxios"
import type { Booking, BookingRules } from "@/lib/types/api"
import { formatMinutesOfDay, toDateParam } from "@/lib/utils/date"

/*
 * Week calendar for admin bookings: seven day-columns, an hour axis spanning
 * the shop's operating window (GET /booking-rules), blocks positioned by
 * start/duration and colored by master-data status. Prev/next moves by week.
 * Cancelled/no-show fade so gaps read as cancellations, not empty slots.
 */

const PX_PER_HOUR = 48
const FADED = new Set(["CANCELLED", "NO_SHOW"])

/** Monday of the week containing `date` (shop weeks read Mon→Sun). */
function startOfWeek(date: Date): Date {
  const monday = new Date(date)
  const weekday = (monday.getDay() + 6) % 7 // 0 = Monday
  monday.setDate(monday.getDate() - weekday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function minutesOfDay(iso: string): number {
  const date = new Date(iso)
  return date.getHours() * 60 + date.getMinutes()
}

type Placed = { booking: Booking; startMin: number; endMin: number; col: number; cols: number }

/**
 * Lay overlapping bookings side-by-side. Bookings are grouped into clusters
 * (chains that transitively overlap); within a cluster each gets the lowest
 * free column, and every block in the cluster shares the cluster's column
 * count so widths line up and nothing stacks on top of anything else.
 */
function layoutDay(list: Booking[], openMin: number, closeMin: number): Placed[] {
  const items = list
    .map((booking) => ({
      booking,
      startMin: Math.max(minutesOfDay(booking.startsAt), openMin),
      endMin: Math.min(minutesOfDay(booking.endsAt), closeMin),
    }))
    .filter((item) => item.endMin > item.startMin)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  const placed: Placed[] = []
  let cluster: (typeof items)[number][] = []
  let clusterEnd = -1
  const colEnds: number[] = [] // last end-time per column, for the current cluster

  const flush = () => {
    const cols = colEnds.length
    for (const entry of cluster) placed.push({ ...entry, col: (entry as Placed).col, cols })
    cluster = []
    colEnds.length = 0
    clusterEnd = -1
  }

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush()
    let col = colEnds.findIndex((end) => end <= item.startMin)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(item.endMin)
    } else {
      colEnds[col] = item.endMin
    }
    ;(item as Placed).col = col
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  if (cluster.length > 0) flush()
  return placed
}

export function BookingsCalendar({ bookings, onSelect }: { bookings: Booking[]; onSelect: (booking: Booking) => void }) {
  const t = useTranslations("admin.bookings")
  const format = useFormatter()
  const { data: rules } = useAxios<BookingRules>("/booking-rules")

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const openMin = rules?.openMin ?? 9 * 60
  const closeMin = rules?.closeMin ?? 18 * 60
  const totalMin = Math.max(closeMin - openMin, 60)
  const bodyHeight = (totalMin / 60) * PX_PER_HOUR

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + index)
        return date
      }),
    [weekStart],
  )

  // Group the loaded bookings by calendar day once
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const booking of bookings) {
      const key = toDateParam(new Date(booking.startsAt))
      map.set(key, [...(map.get(key) ?? []), booking])
    }
    return map
  }, [bookings])

  const hourMarks: number[] = []
  for (let minute = openMin; minute <= closeMin; minute += 60) hourMarks.push(minute)

  const shiftWeek = (weeks: number) => {
    setWeekStart((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + weeks * 7)
      return next
    })
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const todayKey = toDateParam(new Date())

  return (
    <div className="flex flex-col gap-3">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label={t("prevWeek")} onClick={() => shiftWeek(-1)}>
          <RiArrowLeftSLine />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          {t("thisWeek")}
        </Button>
        <Button variant="outline" size="icon-sm" aria-label={t("nextWeek")} onClick={() => shiftWeek(1)}>
          <RiArrowRightSLine />
        </Button>
        <span className="text-muted-foreground ml-2 text-sm">
          {format.dateTime(weekStart, { day: "numeric", month: "short" })} –{" "}
          {format.dateTime(weekEnd, { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
          {/* Day headers */}
          <div className="flex border-b pb-2">
            <div className="w-12 shrink-0" />
            {days.map((day) => {
              const isToday = toDateParam(day) === todayKey
              return (
                <div key={day.toISOString()} className="flex-1 px-1 text-center">
                  <p className="text-muted-foreground text-xs">{format.dateTime(day, { weekday: "short" })}</p>
                  <p className={isToday ? "text-primary text-sm font-bold" : "text-sm font-medium"}>
                    {format.dateTime(day, { day: "numeric" })}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="relative flex" style={{ height: bodyHeight }}>
            {/* Hour gridlines + axis labels */}
            {hourMarks.map((minute) => (
              <div
                key={minute}
                className="border-border/60 absolute inset-x-0 border-t"
                style={{ top: ((minute - openMin) / totalMin) * bodyHeight }}
                aria-hidden
              >
                <span className="text-muted-foreground bg-background pr-1 text-[10px] tabular-nums">
                  {formatMinutesOfDay(minute)}
                </span>
              </div>
            ))}

            <div className="w-12 shrink-0" />
            {days.map((day) => {
              const placed = layoutDay(byDay.get(toDateParam(day)) ?? [], openMin, closeMin)
              return (
                <div key={day.toISOString()} className="border-border/40 relative flex-1 border-l">
                  {placed.map(({ booking, startMin, endMin, col, cols }) => {
                    const faded = FADED.has(booking.status.code)
                    const widthPct = 100 / cols
                    return (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => onSelect(booking)}
                        className="absolute overflow-hidden rounded-md border px-1 py-0.5 text-left text-[11px] shadow-sm transition-transform hover:z-20 hover:scale-[1.02]"
                        style={{
                          top: ((startMin - openMin) / totalMin) * bodyHeight + 1,
                          height: Math.max(((endMin - startMin) / totalMin) * bodyHeight - 2, 18),
                          left: `calc(${col * widthPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                          zIndex: 10 + col,
                          backgroundColor: booking.status.hexBgColorCode ?? "var(--secondary)",
                          color: booking.status.hexTextColorCode ?? "var(--secondary-foreground)",
                          opacity: faded ? 0.5 : 1,
                        }}
                        title={`${format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })} · ${booking.serviceName} — ${booking.petName} (${booking.clientName}) · ${booking.staffName ?? ""} · ${booking.status.code}`}
                      >
                        <span className={faded ? "block truncate font-medium line-through" : "block truncate font-medium"}>
                          {format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })}{" "}
                          {booking.petName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
