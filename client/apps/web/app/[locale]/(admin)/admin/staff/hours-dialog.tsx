"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

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

import { useMutation } from "@/hooks/useMutation"
import { api } from "@/lib/api/client"
import type { StaffAdmin } from "@/lib/types/api"
import { formatMinutesOfDay, parseTimeToMinutes } from "@/lib/utils/date"

type DayDraft = { off: boolean; start: string; end: string }

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
const DEFAULT_DAY: DayDraft = { off: true, start: "09:00", end: "18:00" }

/** Weekly working-hours editor. Mounted only while open — drafts seed from the staff row. */
export function HoursDialog({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffAdmin
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("admin.staff")
  const tc = useTranslations("common")
  const mutation = useMutation()

  const weekdayNames: Record<number, string> = {
    0: t("weekdaySun"),
    1: t("weekdayMon"),
    2: t("weekdayTue"),
    3: t("weekdayWed"),
    4: t("weekdayThu"),
    5: t("weekdayFri"),
    6: t("weekdaySat"),
  }

  const [drafts, setDrafts] = useState<Record<number, DayDraft>>(() =>
    Object.fromEntries(
      WEEKDAYS.map((weekday) => {
        const current = staff.workingHours.find((entry) => entry.weekday === weekday)
        return [
          weekday,
          current
            ? { off: false, start: formatMinutesOfDay(current.startMin), end: formatMinutesOfDay(current.endMin) }
            : DEFAULT_DAY,
        ]
      }),
    ) as Record<number, DayDraft>,
  )
  const [errors, setErrors] = useState<Record<number, string | undefined>>({})

  const updateDay = (weekday: number, patch: Partial<DayDraft>) => {
    setDrafts((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? DEFAULT_DAY), ...patch } }))
    setErrors((current) => ({ ...current, [weekday]: undefined }))
  }

  const save = async () => {
    const nextErrors: Record<number, string | undefined> = {}
    const entries = WEEKDAYS.flatMap((weekday) => {
      const draft = drafts[weekday] ?? DEFAULT_DAY
      if (draft.off) return []
      const startMin = parseTimeToMinutes(draft.start)
      const endMin = parseTimeToMinutes(draft.end)
      if (!draft.start || !draft.end || endMin <= startMin) {
        nextErrors[weekday] = t("hoursInvalid")
        return []
      }
      return [{ weekday, startMin, endMin }]
    })
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      return
    }
    await mutation.run(() => api.put(`/staff/${staff.id}/working-hours`, { entries }), {
      successMessage: tc("saved"),
      onSuccess: onSaved,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("editHours")}</DialogTitle>
          <DialogDescription>{staff.displayName || staff.user.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {WEEKDAYS.map((weekday) => {
            const draft = drafts[weekday] ?? DEFAULT_DAY
            return (
              <div key={weekday} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[7rem_5rem_1fr] sm:items-center">
                <p className="text-sm font-medium">{weekdayNames[weekday]}</p>
                <Field orientation="horizontal">
                  <Input
                    id={`weekday-${weekday}-off`}
                    type="checkbox"
                    className="size-4"
                    checked={draft.off}
                    onChange={(event) => updateDay(weekday, { off: event.target.checked })}
                  />
                  <FieldLabel htmlFor={`weekday-${weekday}-off`}>{t("off")}</FieldLabel>
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="time"
                    value={draft.start}
                    disabled={draft.off}
                    onChange={(event) => updateDay(weekday, { start: event.target.value })}
                  />
                  <Input
                    type="time"
                    value={draft.end}
                    disabled={draft.off}
                    onChange={(event) => updateDay(weekday, { end: event.target.value })}
                  />
                </div>
                {errors[weekday] && <FieldError className="sm:col-span-3">{errors[weekday]}</FieldError>}
              </div>
            )
          })}
        </div>
        {mutation.error && <FieldError>{mutation.error}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
          <Button disabled={mutation.busy} onClick={() => void save()}>
            {mutation.busy ? tc("loading") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
