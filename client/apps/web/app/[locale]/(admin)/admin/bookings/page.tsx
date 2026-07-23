"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import type { Booking } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"

/** Mirror of the server transition map (bookings.service.ts) — UX only. */
const TRANSITIONS: Record<string, readonly string[]> = {
  CONFIRMED: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
}

type Filter = "today" | "upcoming" | "all"

export default function AdminBookingsPage() {
  const t = useTranslations("admin.bookings")
  const tc = useTranslations("common")
  const format = useFormatter()
  const { can } = useAuth()

  const { data: bookings, isLoading, refetch } = useAxios<Booking[]>("/bookings", { throwOnError: true })
  const [filter, setFilter] = useState<Filter>("today")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const todayKey = toDateParam(new Date())
    const list = (bookings ?? []).filter((booking) => {
      const key = toDateParam(new Date(booking.startsAt))
      if (filter === "today") return key === todayKey
      if (filter === "upcoming") return key >= todayKey
      return true
    })
    return list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [bookings, filter])

  const transition = async (booking: Booking, toStatusCode: string) => {
    setBusyId(booking.id)
    setActionError(null)
    try {
      await api.patch(`/bookings/${booking.id}/status`, { toStatusCode })
      refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err, tc("error")))
    } finally {
      setBusyId(null)
    }
  }

  const markPaid = async (booking: Booking) => {
    setBusyId(booking.id)
    setActionError(null)
    try {
      await api.patch(`/bookings/${booking.id}/payment`)
      refetch()
    } catch (err) {
      setActionError(apiErrorMessage(err, tc("error")))
    } finally {
      setBusyId(null)
    }
  }

  const actionLabel: Record<string, string> = {
    IN_PROGRESS: t("start"),
    COMPLETED: t("complete"),
    NO_SHOW: t("noShow"),
    CANCELLED: t("cancel"),
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="today">{t("filterToday")}</TabsTrigger>
            <TabsTrigger value="upcoming">{t("filterUpcoming")}</TabsTrigger>
            <TabsTrigger value="all">{t("filterAll")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {actionError && <p className="text-destructive text-sm">{actionError}</p>}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colWhen")}</TableHead>
              <TableHead>{t("colClient")}</TableHead>
              <TableHead>{t("colPet")}</TableHead>
              <TableHead>{t("colService")}</TableHead>
              <TableHead>{t("colStaff")}</TableHead>
              <TableHead className="text-right">{t("colPrice")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colPayment")}</TableHead>
              <TableHead>{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((booking) => {
              const targets = TRANSITIONS[booking.status.code] ?? []
              const busy = busyId === booking.id
              return (
                <TableRow key={booking.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {format.dateTime(new Date(booking.startsAt), { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>{booking.clientName}</TableCell>
                  <TableCell>{booking.petName}</TableCell>
                  <TableCell>{booking.serviceName}</TableCell>
                  <TableCell>{booking.staffName}</TableCell>
                  <TableCell className="text-right tabular-nums">฿{Number(booking.priceThb)}</TableCell>
                  <TableCell>
                    <Badge
                      style={
                        booking.status.hexBgColorCode
                          ? {
                              backgroundColor: booking.status.hexBgColorCode,
                              color: booking.status.hexTextColorCode ?? undefined,
                            }
                          : undefined
                      }
                    >
                      {booking.status.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking.paymentStatus === "PAID" ? (
                      <Badge variant="secondary">PAID</Badge>
                    ) : (
                      // CANCELLED bookings are never payable (server enforces too)
                      booking.status.code !== "CANCELLED" &&
                      can(Permissions.UPDATE_BOOKING) && (
                        <Button variant="outline" size="xs" disabled={busy} onClick={() => void markPaid(booking)}>
                          {t("markPaid")}
                        </Button>
                      )
                    )}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {can(Permissions.UPDATE_BOOKING) &&
                      targets.map((target) => (
                        <Button
                          key={target}
                          variant={target === "CANCELLED" || target === "NO_SHOW" ? "destructive" : "outline"}
                          size="xs"
                          disabled={busy}
                          onClick={() => void transition(booking, target)}
                        >
                          {actionLabel[target]}
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
