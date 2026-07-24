"use client"

import { useMemo, useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import {
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"

import { serviceDisplay, type Booking, type Service } from "@/lib/types/api"

/*
 * Dashboard trends (dataviz skill): three single-series charts — bookings and
 * revenue over a selectable window (day/week/month/year), and bookings by
 * service. Count and baht never share an axis (no dual-axis); every chart is
 * one hue (--chart-mark, contrast-validated per theme), thin bars with 4px
 * data-end radius, recessive grid, hover tooltips, direct labels on ranked bars.
 */

type Period = "day" | "week" | "month" | "year"

// Narrow subset next-intl's format.dateTime accepts (its options type is
// stricter than the DOM Intl.DateTimeFormatOptions on a few fields).
type TickFormat = { day?: "numeric"; month?: "short"; year?: "numeric" }

// Each period defines how many buckets to show, how to snap a date to its
// bucket start, how to step back one bucket, and how to label the axis tick.
const PERIODS: Record<
  Period,
  {
    buckets: number
    start: (date: Date) => Date
    step: (date: Date, n: number) => Date
    tick: TickFormat
  }
> = {
  day: { buckets: 14, start: startOfDay, step: subDays, tick: { day: "numeric", month: "short" } },
  week: { buckets: 12, start: (d) => startOfWeek(d, { weekStartsOn: 1 }), step: subWeeks, tick: { day: "numeric", month: "short" } },
  month: { buckets: 12, start: startOfMonth, step: subMonths, tick: { month: "short" } },
  year: { buckets: 5, start: startOfYear, step: subYears, tick: { year: "numeric" } },
}

const PERIOD_ORDER: Period[] = ["day", "week", "month", "year"]

type Bucket = { key: number; label: string; bookings: number; revenue: number }

export function DashboardCharts({ bookings, services }: { bookings: Booking[]; services: Service[] }) {
  const t = useTranslations("admin.dashboard")
  const format = useFormatter()
  const locale = useLocale()
  const [period, setPeriod] = useState<Period>("day")

  const { byBucket, byService } = useMemo(() => {
    const config = PERIODS[period]
    const now = new Date()
    // Oldest → newest buckets, each keyed by its start-of-period timestamp.
    const buckets: Bucket[] = []
    for (let i = config.buckets - 1; i >= 0; i--) {
      const start = config.start(config.step(now, i))
      buckets.push({
        key: start.getTime(),
        label: format.dateTime(start, config.tick),
        bookings: 0,
        revenue: 0,
      })
    }
    const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    const serviceCounts = new Map<string, { fallbackName: string; count: number }>()

    for (const booking of bookings) {
      const key = config.start(new Date(booking.startsAt)).getTime()
      const bucket = bucketByKey.get(key)
      if (bucket) {
        bucket.bookings += 1
        if (booking.paymentStatus === "PAID") bucket.revenue += Number(booking.priceThb)
      }
      const entry = serviceCounts.get(booking.serviceId) ?? { fallbackName: booking.serviceName, count: 0 }
      entry.count += 1
      serviceCounts.set(booking.serviceId, entry)
    }

    const byService = [...serviceCounts.entries()]
      .map(([serviceId, entry]) => {
        // Deleted services vanish from /services — the booking snapshot keeps the name
        const service = services.find((candidate) => candidate.id === serviceId)
        return { name: service ? serviceDisplay(service, locale).name : entry.fallbackName, count: entry.count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return { byBucket: buckets, byService }
  }, [bookings, services, format, locale, period])

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
    <div className="flex flex-col gap-3">
      {/* Segmented control — same window drives both trend charts */}
      <div className="flex items-center justify-end">
        <div className="bg-muted inline-flex rounded-lg p-0.5">
          {PERIOD_ORDER.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={cn(
                "h-7 px-3 text-xs",
                period === option && "bg-background text-foreground shadow-sm",
              )}
            >
              {t(`period${option.charAt(0).toUpperCase()}${option.slice(1)}` as Parameters<typeof t>[0])}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Bookings per bucket */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("chartBookingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bookingsConfig} className="h-48 w-full">
              <BarChart data={byBucket} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
                <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
                <Bar dataKey="bookings" fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue per bucket — separate panel, never a second axis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("chartRevenueTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-48 w-full">
              <BarChart data={byBucket} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
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
    </div>
  )
}
