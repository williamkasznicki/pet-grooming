"use client"

import { useState } from "react"
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
import { useApiQuery } from "@/lib/api/use-api-query"
import type { Booking } from "@/lib/types/api"

/** One state machine for the cancel dialog instead of open/target/error/busy quads. */
type CancelDialog = { mode: "closed" } | { mode: "confirm"; booking: Booking; busy?: boolean; busyError?: string }

export default function BookingsPage() {
  const t = useTranslations("bookings")
  const tc = useTranslations("common")
  const format = useFormatter()

  // Page-critical query: failures render the segment's error.tsx boundary.
  const { data: bookings, isLoading, refetch } = useApiQuery<Booking[]>("/bookings", { throwOnError: true })
  const [dialog, setDialog] = useState<CancelDialog>({ mode: "closed" })

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
      <h1 className="mb-6 text-3xl font-semibold">{t("title")}</h1>

      {isLoading || bookings === undefined ? (
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
