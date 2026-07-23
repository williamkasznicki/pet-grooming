"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FieldError } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { BookingRulesCard } from "@/components/booking-rules"
import { Link } from "@/i18n/navigation"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAxios } from "@/hooks/useAxios"
import type { Booking } from "@/lib/types/api"

/** One state machine for the cancel dialog instead of open/target/error/busy quads. */
type CancelDialog = { mode: "closed" } | { mode: "confirm"; booking: Booking; busy?: boolean; busyError?: string }

export default function BookingsPage() {
  const t = useTranslations("bookings")
  const tc = useTranslations("common")
  const format = useFormatter()

  // Page-critical query: failures render the segment's error.tsx boundary.
  const { data: bookings, isLoading, refetch } = useAxios<Booking[]>("/bookings", { throwOnError: true })
  const [dialog, setDialog] = useState<CancelDialog>({ mode: "closed" })
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const statusOptions = useMemo(
    () => [...new Set((bookings ?? []).map((booking) => booking.status.code))].sort(),
    [bookings],
  )

  const visible = useMemo(() => {
    const nowIso = new Date().toISOString()
    const query = search.trim().toLowerCase()
    return (bookings ?? [])
      .filter((booking) => {
        if (filter === "upcoming" && booking.endsAt < nowIso) return false
        if (filter === "past" && booking.endsAt >= nowIso) return false
        if (statusFilter !== "all" && booking.status.code !== statusFilter) return false
        if (query && !`${booking.serviceName} ${booking.petName}`.toLowerCase().includes(query)) return false
        return true
      })
      // Upcoming reads soonest-first; past reads most-recent-first
      .sort((a, b) => (filter === "past" ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)))
  }, [bookings, filter, statusFilter, search])

  const confirmCancel = async () => {
    if (dialog.mode !== "confirm") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.post(`/bookings/${dialog.booking.id}/cancel`)
      setDialog({ mode: "closed" })
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList>
            <TabsTrigger value="upcoming">{t("filterUpcoming")}</TabsTrigger>
            <TabsTrigger value="past">{t("filterPast")}</TabsTrigger>
            <TabsTrigger value="all">{t("filterAll")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Refinement filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
      </div>

      {isLoading || bookings === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
            <Button render={<Link href="/book" />}>{t("bookCta")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{booking.serviceName}</CardTitle>
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
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <p className="font-medium">{booking.petName}</p>
                {booking.staffName && <p className="text-muted-foreground">{t("with", { staff: booking.staffName })}</p>}
                <p>{format.dateTime(new Date(booking.startsAt), { dateStyle: "medium", timeStyle: "short" })}</p>
                <p className="text-muted-foreground">{t("price", { price: format.number(Number(booking.priceThb)) })}</p>
                <p>{booking.paymentStatus === "PAID" ? t("paymentPAID") : t("paymentUNPAID")}</p>
                {booking.status.code === "CONFIRMED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 self-start"
                    onClick={() => setDialog({ mode: "confirm", booking })}
                  >
                    {t("cancel")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BookingRulesCard className="border-border text-muted-foreground mt-10 border-t pt-5" />

      <Dialog open={dialog.mode === "confirm"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelConfirm")}</DialogTitle>
            {dialog.mode === "confirm" && (
              <DialogDescription>
                {dialog.booking.serviceName} ·{" "}
                {format.dateTime(new Date(dialog.booking.startsAt), { dateStyle: "medium", timeStyle: "short" })}
              </DialogDescription>
            )}
          </DialogHeader>
          {dialog.mode === "confirm" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("cancelKeep")}</DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmCancel()}
              disabled={dialog.mode === "confirm" && dialog.busy}
            >
              {dialog.mode === "confirm" && dialog.busy ? tc("loading") : t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
