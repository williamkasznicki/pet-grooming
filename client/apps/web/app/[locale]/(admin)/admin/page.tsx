"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { useAxios } from "@/hooks/useAxios"
import type { Booking } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"

function StatusBadge({ booking }: { booking: Booking }) {
  return (
    <Badge
      style={
        booking.status.hexBgColorCode
          ? { backgroundColor: booking.status.hexBgColorCode, color: booking.status.hexTextColorCode ?? undefined }
          : undefined
      }
    >
      {booking.status.code}
    </Badge>
  )
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard")
  const format = useFormatter()

  const { data: bookings, isLoading } = useAxios<Booking[]>("/bookings", { throwOnError: true })

  const { today, statusCounts } = useMemo(() => {
    const todayKey = toDateParam(new Date())
    const todays = (bookings ?? [])
      .filter((booking) => toDateParam(new Date(booking.startsAt)) === todayKey)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    const counts = new Map<string, number>()
    for (const booking of todays) {
      counts.set(booking.status.code, (counts.get(booking.status.code) ?? 0) + 1)
    }
    return { today: todays, statusCounts: counts }
  }, [bookings])

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("today")}</h1>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {[...statusCounts.entries()].map(([status, count]) => (
              <Card key={status} className="min-w-32">
                <CardContent className="pt-6">
                  <p className="text-2xl font-semibold tabular-nums">{count}</p>
                  <p className="text-muted-foreground text-xs">{status}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("today")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {today.length === 0 && <p className="text-muted-foreground text-sm">{t("noBookings")}</p>}
              {today.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0">
                  <span className="tabular-nums">
                    {format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex-1 truncate">
                    {booking.serviceName} — {booking.petName} ({booking.clientName})
                  </span>
                  <span className="text-muted-foreground">{booking.staffName}</span>
                  <StatusBadge booking={booking} />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
