"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Skeleton } from "@workspace/ui/components/skeleton"

import { Link } from "@/i18n/navigation"
import { api, apiErrorMessage } from "@/lib/api/client"
import type { Booking } from "@/lib/types/api"

export default function BookingsPage() {
  const t = useTranslations("bookings")
  const tc = useTranslations("common")
  const format = useFormatter()

  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadBookings = useCallback(async () => {
    try {
      const res = await api.get<Booking[]>("/bookings")
      setLoadError(null)
      setBookings(res.data)
    } catch (err) {
      setLoadError(apiErrorMessage(err, tc("error")))
      setBookings([])
    }
  }, [tc])

  useEffect(() => {
    let ignore = false
    void api
      .get<Booking[]>("/bookings")
      .then((res) => {
        if (ignore) return
        setLoadError(null)
        setBookings(res.data)
      })
      .catch((err: unknown) => {
        if (ignore) return
        setLoadError(apiErrorMessage(err, tc("error")))
        setBookings([])
      })
    return () => {
      ignore = true
    }
  }, [tc])

  const openCancelDialog = (booking: Booking) => {
    setBookingToCancel(booking)
    setCancelError(null)
    setCancelDialogOpen(true)
  }

  const confirmCancel = async () => {
    if (!bookingToCancel) return
    setCancelling(true)
    setCancelError(null)
    try {
      await api.post(`/bookings/${bookingToCancel.id}/cancel`)
      setCancelDialogOpen(false)
      setBookingToCancel(null)
      await loadBookings()
    } catch (err) {
      setCancelError(apiErrorMessage(err, tc("error")))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">{t("title")}</h1>

      {loadError && <p className="text-destructive mb-4 text-sm">{loadError}</p>}

      {bookings === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
            <Button render={<Link href="/book" />}>{t("bookCta")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookings.map((booking) => (
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
                  <Button variant="outline" size="sm" className="mt-2 self-start" onClick={() => openCancelDialog(booking)}>
                    {t("cancel")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open)
          if (!open) setBookingToCancel(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelConfirm")}</DialogTitle>
            {bookingToCancel && (
              <DialogDescription>
                {bookingToCancel.serviceName} ·{" "}
                {format.dateTime(new Date(bookingToCancel.startsAt), { dateStyle: "medium", timeStyle: "short" })}
              </DialogDescription>
            )}
          </DialogHeader>
          {cancelError && <FieldError>{cancelError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("cancelKeep")}</DialogClose>
            <Button variant="destructive" onClick={() => void confirmCancel()} disabled={cancelling}>
              {cancelling ? tc("loading") : t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
