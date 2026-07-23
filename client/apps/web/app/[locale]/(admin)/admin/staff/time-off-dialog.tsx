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
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { useMutation } from "@/hooks/useMutation"
import { api } from "@/lib/api/client"
import type { StaffAdmin, StaffTimeOff } from "@/lib/types/api"
import { optionalString } from "@/lib/utils/string"

/** Add time off (permanent or a datetime range). Mounted only while open. */
export function TimeOffDialog({
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

  const [values, setValues] = useState({ isPermanent: false, startsAt: "", endsAt: "", reason: "" })
  const [rangeError, setRangeError] = useState<string | null>(null)

  const save = async () => {
    if (!values.isPermanent && (!values.startsAt || !values.endsAt)) {
      setRangeError(t("timeOffRangeRequired"))
      return
    }
    await mutation.run(
      () =>
        api.post(`/staff/${staff.id}/time-off`, {
          isPermanent: values.isPermanent,
          startsAt: values.isPermanent ? undefined : new Date(values.startsAt).toISOString(),
          endsAt: values.isPermanent ? undefined : new Date(values.endsAt).toISOString(),
          reason: optionalString(values.reason),
        }),
      { successMessage: tc("saved"), onSuccess: onSaved },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addTimeOff")}</DialogTitle>
          <DialogDescription>{staff.displayName || staff.user.email}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field orientation="horizontal">
            <Input
              id="time-off-permanent"
              type="checkbox"
              className="size-4"
              checked={values.isPermanent}
              onChange={(event) => setValues({ ...values, isPermanent: event.target.checked })}
            />
            <FieldLabel htmlFor="time-off-permanent">{t("permanent")}</FieldLabel>
          </Field>
          {!values.isPermanent && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="time-off-start">{t("startsAt")}</FieldLabel>
                <Input
                  id="time-off-start"
                  type="datetime-local"
                  value={values.startsAt}
                  onChange={(event) => {
                    setValues({ ...values, startsAt: event.target.value })
                    setRangeError(null)
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="time-off-end">{t("endsAt")}</FieldLabel>
                <Input
                  id="time-off-end"
                  type="datetime-local"
                  value={values.endsAt}
                  onChange={(event) => {
                    setValues({ ...values, endsAt: event.target.value })
                    setRangeError(null)
                  }}
                />
              </Field>
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="time-off-reason">{t("reason")}</FieldLabel>
            <Textarea
              id="time-off-reason"
              value={values.reason}
              onChange={(event) => setValues({ ...values, reason: event.target.value })}
            />
          </Field>
          {rangeError && <FieldError>{rangeError}</FieldError>}
          {mutation.error && <FieldError>{mutation.error}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button disabled={mutation.busy} onClick={() => void save()}>
              {mutation.busy ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}

/** Delete-time-off confirm. */
export function DeleteTimeOffDialog({
  staff,
  timeOff,
  onClose,
  onDeleted,
}: {
  staff: StaffAdmin
  timeOff: StaffTimeOff
  onClose: () => void
  onDeleted: () => void
}) {
  const t = useTranslations("admin.staff")
  const tc = useTranslations("common")
  const mutation = useMutation()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTimeOffConfirm")}</DialogTitle>
        </DialogHeader>
        {mutation.error && <FieldError>{mutation.error}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
          <Button
            variant="destructive"
            disabled={mutation.busy}
            onClick={() =>
              void mutation.run(() => api.delete(`/staff/${staff.id}/time-off/${timeOff.id}`), {
                successMessage: tc("deleted"),
                onSuccess: onDeleted,
              })
            }
          >
            {mutation.busy ? tc("loading") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
