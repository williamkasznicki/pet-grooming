"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { toast } from "sonner"
import { RiCalendar2Line, RiListCheck2 } from "@remixicon/react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
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

import { MasterDataBadge } from "@/components/master-data-badge"
import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import type { Booking } from "@/lib/types/api"
import { toDateParam } from "@/lib/utils/date"
import { BookingsCalendar } from "./bookings-calendar"

/** Mirror of the server transition map (bookings.service.ts) — UX only. */
const TRANSITIONS: Record<string, readonly string[]> = {
  CONFIRMED: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
}

type Filter = "today" | "upcoming" | "all"

/** Status changes and payment both confirm first; transitions carry a remark. */
type ConfirmDialog =
  | { mode: "closed" }
  | { mode: "status"; booking: Booking; target: string; note: string; busy?: boolean; busyError?: string }
  | { mode: "paid"; booking: Booking; busy?: boolean; busyError?: string }

export default function AdminBookingsPage() {
  const t = useTranslations("admin.bookings")
  const tc = useTranslations("common")
  const format = useFormatter()
  const { can } = useAuth()

  const { data: bookings, isLoading, refetch } = useAxios<Booking[]>("/bookings", { throwOnError: true })
  const [view, setView] = useState<"list" | "calendar">("list")
  const [filter, setFilter] = useState<Filter>("today")
  const [statusFilter, setStatusFilter] = useState("all")
  const [staffFilter, setStaffFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<ConfirmDialog>({ mode: "closed" })

  // Filter options derived from the loaded data — always match what exists
  const { statusOptions, staffOptions } = useMemo(
    () => ({
      statusOptions: [...new Set((bookings ?? []).map((booking) => booking.status.code))].sort(),
      staffOptions: [...new Set((bookings ?? []).map((booking) => booking.staffName).filter(Boolean))].sort() as string[],
    }),
    [bookings],
  )

  // Search/status/staff filters apply to BOTH views; the calendar does its own
  // week windowing, so the today/upcoming/all date tab is list-view only.
  const refined = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (bookings ?? []).filter((booking) => {
      if (statusFilter !== "all" && booking.status.code !== statusFilter) return false
      if (staffFilter !== "all" && booking.staffName !== staffFilter) return false
      if (query && !`${booking.clientName} ${booking.petName}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [bookings, statusFilter, staffFilter, search])

  const visible = useMemo(() => {
    const todayKey = toDateParam(new Date())
    return refined
      .filter((booking) => {
        const key = toDateParam(new Date(booking.startsAt))
        if (filter === "today" && key !== todayKey) return false
        if (filter === "upcoming" && key < todayKey) return false
        return true
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [refined, filter])

  const confirmStatus = async () => {
    if (dialog.mode !== "status") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.patch(`/bookings/${dialog.booking.id}/status`, {
        toStatusCode: dialog.target,
        note: dialog.note.trim() || undefined,
      })
      setDialog({ mode: "closed" })
      toast.success(tc("updated"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const confirmPaid = async () => {
    if (dialog.mode !== "paid") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.patch(`/bookings/${dialog.booking.id}/payment`)
      setDialog({ mode: "closed" })
      toast.success(tc("updated"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
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
        <div className="flex flex-wrap items-center gap-2">
          {view === "list" && (
            <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
              <TabsList>
                <TabsTrigger value="today">{t("filterToday")}</TabsTrigger>
                <TabsTrigger value="upcoming">{t("filterUpcoming")}</TabsTrigger>
                <TabsTrigger value="all">{t("filterAll")}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {/* View switch: table vs week calendar */}
          <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
            <TabsList>
              <TabsTrigger value="list">
                <RiListCheck2 data-icon="inline-start" />
                {t("viewList")}
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <RiCalendar2Line data-icon="inline-start" />
                {t("viewCalendar")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : view === "calendar" ? (
        <BookingsCalendar
          bookings={refined}
          onSelect={(booking) => {
            // Jump to the list focused on this booking (so its actions are reachable)
            setView("list")
            setFilter("all")
            setSearch(booking.petName)
          }}
        />
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
              const allowed = can(Permissions.UPDATE_BOOKING)
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
                    <MasterDataBadge colors={booking.status}>{booking.status.code}</MasterDataBadge>
                  </TableCell>
                  <TableCell>
                    {booking.paymentStatus === "PAID" ? (
                      <Badge variant="secondary">PAID</Badge>
                    ) : (
                      // CANCELLED bookings are never payable (server enforces too)
                      booking.status.code !== "CANCELLED" && (
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={!allowed}
                          title={allowed ? undefined : t("noPermission")}
                          onClick={() => setDialog({ mode: "paid", booking })}
                        >
                          {t("markPaid")}
                        </Button>
                      )
                    )}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {targets.length === 0 ? (
                      // Terminal states (COMPLETED/CANCELLED/NO_SHOW) have no
                      // transitions — show that explicitly instead of a blank
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      // Visible even without permission — disabled with a hint
                      targets.map((target) => (
                        <Button
                          key={target}
                          variant={target === "CANCELLED" || target === "NO_SHOW" ? "destructive" : "outline"}
                          size="xs"
                          disabled={!allowed}
                          title={allowed ? undefined : t("noPermission")}
                          onClick={() => setDialog({ mode: "status", booking, target, note: "" })}
                        >
                          {actionLabel[target]}
                        </Button>
                      ))
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Status transition confirm + remark */}
      <Dialog open={dialog.mode === "status"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "status" ? t("confirmStatusTitle", { action: actionLabel[dialog.target] ?? dialog.target }) : null}
            </DialogTitle>
            {dialog.mode === "status" && (
              <DialogDescription>
                {dialog.booking.serviceName} — {dialog.booking.petName} ·{" "}
                {format.dateTime(new Date(dialog.booking.startsAt), { dateStyle: "medium", timeStyle: "short" })}
              </DialogDescription>
            )}
          </DialogHeader>
          {dialog.mode === "status" && (
            <>
              <Field>
                <FieldLabel htmlFor="status-note">{t("remark")}</FieldLabel>
                <Textarea
                  id="status-note"
                  placeholder={t("remarkPlaceholder")}
                  maxLength={500}
                  value={dialog.note}
                  onChange={(event) => setDialog({ ...dialog, note: event.target.value })}
                />
              </Field>
              {dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
                <Button
                  variant={dialog.target === "CANCELLED" || dialog.target === "NO_SHOW" ? "destructive" : "default"}
                  disabled={dialog.busy}
                  onClick={() => void confirmStatus()}
                >
                  {dialog.busy ? tc("loading") : (actionLabel[dialog.target] ?? dialog.target)}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark-paid confirm */}
      <Dialog open={dialog.mode === "paid"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmPaidTitle")}</DialogTitle>
            {dialog.mode === "paid" && (
              <DialogDescription>
                {dialog.booking.clientName} · {dialog.booking.serviceName} · ฿{Number(dialog.booking.priceThb)}
              </DialogDescription>
            )}
          </DialogHeader>
          {dialog.mode === "paid" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button disabled={dialog.mode === "paid" && dialog.busy} onClick={() => void confirmPaid()}>
              {dialog.mode === "paid" && dialog.busy ? tc("loading") : t("markPaid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
