"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
  const [statusFilter, setStatusFilter] = useState("all")
  const [staffFilter, setStaffFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Filter options derived from the loaded data — always match what exists
  const { statusOptions, staffOptions } = useMemo(
    () => ({
      statusOptions: [...new Set((bookings ?? []).map((booking) => booking.status.code))].sort(),
      staffOptions: [...new Set((bookings ?? []).map((booking) => booking.staffName).filter(Boolean))].sort() as string[],
    }),
    [bookings],
  )

  const visible = useMemo(() => {
    const todayKey = toDateParam(new Date())
    const query = search.trim().toLowerCase()
    const list = (bookings ?? []).filter((booking) => {
      const key = toDateParam(new Date(booking.startsAt))
      if (filter === "today" && key !== todayKey) return false
      if (filter === "upcoming" && key < todayKey) return false
      if (statusFilter !== "all" && booking.status.code !== statusFilter) return false
      if (staffFilter !== "all" && booking.staffName !== staffFilter) return false
      if (query && !`${booking.clientName} ${booking.petName}`.toLowerCase().includes(query)) return false
      return true
    })
    return list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [bookings, filter, statusFilter, staffFilter, search])

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="today">{t("filterToday")}</TabsTrigger>
            <TabsTrigger value="upcoming">{t("filterUpcoming")}</TabsTrigger>
            <TabsTrigger value="all">{t("filterAll")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Refinement filters — options derive from loaded data */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          className="w-56"
          aria-label={t("search")}
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as string | null) ?? "all")}>
          <SelectTrigger className="w-40" aria-label={t("filterStatus")}>
            <SelectValue>{statusFilter === "all" ? t("allStatuses") : statusFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {statusOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={staffFilter} onValueChange={(value) => setStaffFilter((value as string | null) ?? "all")}>
          <SelectTrigger className="w-40" aria-label={t("filterStaff")}>
            <SelectValue>{staffFilter === "all" ? t("allStaff") : staffFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStaff")}</SelectItem>
            {staffOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    {can(Permissions.UPDATE_BOOKING) && targets.length === 0 && (
                      // Terminal states (COMPLETED/CANCELLED/NO_SHOW) have no
                      // transitions — show that explicitly instead of a blank
                      <span className="text-muted-foreground">—</span>
                    )}
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
