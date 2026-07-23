"use client"

import { useMemo } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

import { serviceDisplay, type Booking, type Service } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"

/*
 * Dashboard trends (dataviz skill): three single-series charts — bookings/day
 * and revenue/day over the last 14 days, and bookings by service. Count and
 * baht never share an axis (no dual-axis); every chart is one hue
 * (--chart-mark, contrast-validated per theme), thin bars with 4px data-end
 * radius, recessive grid, hover tooltips, direct labels on the ranked bars.
 */

const DAYS = 14

type DayRow = { day: string; label: string; bookings: number; revenue: number }

function lastNDays(): DayRow[] {
  const rows: DayRow[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    rows.push({ day: toDateParam(date), label: "", bookings: 0, revenue: 0 })
  }
  return rows
}

export function DashboardCharts({ bookings, services }: { bookings: Booking[]; services: Service[] }) {
  const t = useTranslations("admin.dashboard")
  const format = useFormatter()
  const locale = useLocale()

  const { byDay, byService } = useMemo(() => {
    const rows = lastNDays()
    const rowByDay = new Map(rows.map((row) => [row.day, row]))
    const serviceCounts = new Map<string, { fallbackName: string; count: number }>()

    for (const booking of bookings) {
      const day = toDateParam(new Date(booking.startsAt))
      const row = rowByDay.get(day)
      if (row) {
        row.bookings += 1
        if (booking.paymentStatus === "PAID") row.revenue += Number(booking.priceThb)
      }
      const entry = serviceCounts.get(booking.serviceId) ?? { fallbackName: booking.serviceName, count: 0 }
      entry.count += 1
      serviceCounts.set(booking.serviceId, entry)
    }
    for (const row of rows) {
      row.label = format.dateTime(new Date(`${row.day}T12:00:00`), { day: "numeric", month: "short" })
    }

    const byService = [...serviceCounts.entries()]
      .map(([serviceId, entry]) => {
        // Deleted services vanish from /services — the booking snapshot keeps the name
        const service = services.find((candidate) => candidate.id === serviceId)
        return { name: service ? serviceDisplay(service, locale).name : entry.fallbackName, count: entry.count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return { byDay: rows, byService }
  }, [bookings, services, format, locale])

  const bookingsConfig = {
    bookings: { label: t("chartBookings"), color: "var(--chart-mark)" },
  } satisfies ChartConfig
  const revenueConfig = {
    revenue: { label: t("chartRevenue"), color: "var(--chart-mark)" },
  } satisfies ChartConfig
  const serviceConfig = {
    count: { label: t("chartBookings"), color: "var(--chart-mark)" },
  } satisfies ChartConfig

  const axisTick = { fontSize: 11 }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Bookings per day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("chartBookingsTitle", { days: DAYS })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={bookingsConfig} className="h-48 w-full">
            <BarChart data={byDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
              <Bar dataKey="bookings" fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue per day — separate panel, never a second axis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("chartRevenueTitle", { days: DAYS })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-48 w-full">
            <BarChart data={byDay} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(value: number) => `฿${format.number(value)}`} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
              <Bar dataKey="revenue" fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Bookings by service — ranked, direct-labeled */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">{t("chartByServiceTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={serviceConfig} className="w-full" style={{ height: Math.max(byService.length * 40, 80) }}>
            <BarChart data={byService} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={axisTick} width={120} />
              <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--chart-mark)" radius={[0, 4, 4, 0]} maxBarSize={18}>
                <LabelList dataKey="count" position="right" className="fill-muted-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
