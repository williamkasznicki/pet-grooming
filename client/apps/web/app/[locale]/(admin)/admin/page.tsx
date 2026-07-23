"use client"

import { useMemo } from "react"
import { useFormatter, useTranslations } from "next-intl"
import {
  RiCalendarScheduleLine,
  RiCheckDoubleLine,
  RiMoneyDollarCircleLine,
  RiTimeLine,
} from "@remixicon/react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { useAxios } from "@/hooks/useAxios"
import { Link } from "@/i18n/navigation"
import type { Booking, Service } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"
import { DashboardCharts } from "./dashboard-charts"

/*
 * Overview per the Stitch admin comp: stat cards with lagoon icon chips
 * (today / upcoming / completed / revenue) over a today's-schedule table.
 * All numbers derive from the bookings list — no separate stats endpoint yet.
 */

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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof RiTimeLine
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-4">
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard")
  const tb = useTranslations("admin.bookings")
  const format = useFormatter()

  const { data: bookings, isLoading } = useAxios<Booking[]>("/bookings", { throwOnError: true })
  const { data: services } = useAxios<Service[]>("/services")

  const stats = useMemo(() => {
    const todayKey = toDateParam(new Date())
    const nowIso = new Date().toISOString()
    const all = bookings ?? []
    const today = all
      .filter((booking) => toDateParam(new Date(booking.startsAt)) === todayKey)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

    const upcomingToday = today.filter(
      (booking) => booking.status.code === "CONFIRMED" && booking.startsAt >= nowIso,
    ).length
    const completedToday = today.filter((booking) => booking.status.code === "COMPLETED").length
    const revenueToday = today
      .filter((booking) => booking.paymentStatus === "PAID")
      .reduce((sum, booking) => sum + Number(booking.priceThb), 0)
    const next7Days = all.filter((booking) => {
      const start = new Date(booking.startsAt)
      const in7 = new Date()
      in7.setDate(in7.getDate() + 7)
      return booking.status.code === "CONFIRMED" && start > new Date() && start <= in7
    }).length

    return { today, upcomingToday, completedToday, revenueToday, next7Days }
  }, [bookings])

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("overview")}</h1>
        <p className="text-muted-foreground text-sm">{t("overviewSubtitle")}</p>
      </div>

      {isLoading || bookings === undefined ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t("statToday")} value={String(stats.today.length)} icon={RiTimeLine} />
            <StatCard label={t("statUpcoming")} value={String(stats.upcomingToday)} icon={RiCalendarScheduleLine} />
            <StatCard label={t("statCompleted")} value={String(stats.completedToday)} icon={RiCheckDoubleLine} />
            <StatCard
              label={t("statRevenue")}
              value={`฿${format.number(stats.revenueToday)}`}
              icon={RiMoneyDollarCircleLine}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("today")}</CardTitle>
              <Link href="/admin/bookings" className="text-primary text-sm font-medium hover:underline">
                {t("viewAll")}
              </Link>
            </CardHeader>
            <CardContent>
              {stats.today.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("noBookings")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tb("colWhen")}</TableHead>
                      <TableHead>{tb("colClient")}</TableHead>
                      <TableHead>{tb("colService")}</TableHead>
                      <TableHead>{tb("colStaff")}</TableHead>
                      <TableHead>{tb("colPrice")}</TableHead>
                      <TableHead>{tb("colStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.today.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="tabular-nums">
                          {format.dateTime(new Date(booking.startsAt), { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{booking.petName}</span>{" "}
                          <span className="text-muted-foreground">({booking.clientName})</span>
                        </TableCell>
                        <TableCell>{booking.serviceName}</TableCell>
                        <TableCell className="text-muted-foreground">{booking.staffName}</TableCell>
                        <TableCell className="font-mono tabular-nums">฿{Number(booking.priceThb)}</TableCell>
                        <TableCell>
                          <StatusBadge booking={booking} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-sm">
            {t("next7", { count: stats.next7Days })}
          </p>

          <DashboardCharts bookings={bookings} services={services ?? []} />
        </>
      )}
    </div>
  )
}
