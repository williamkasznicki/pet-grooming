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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { useMutation } from "@/hooks/useMutation"
import { api } from "@/lib/api/client"
import type { AdminUser, StaffAdmin } from "@/lib/types/api"
import { optionalString } from "@/lib/utils/string"

/**
 * Create/edit a groomer profile. Mounted only while open, so local form state
 * resets naturally between uses. `staff` null ⇒ create mode (needs a user).
 */
export function ProfileDialog({
  staff,
  users,
  onClose,
  onSaved,
}: {
  staff: StaffAdmin | null
  users: Pick<AdminUser, "id" | "email" | "name">[]
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("admin.staff")
  const tc = useTranslations("common")
  const mutation = useMutation()

  const [values, setValues] = useState({
    userId: staff?.userId ?? "",
    displayName: staff?.displayName ?? "",
    bio: staff?.bio ?? "",
    active: staff?.active ?? true,
  })
  const [userError, setUserError] = useState<string | null>(null)

  const save = async () => {
    if (!staff && !values.userId) {
      setUserError(t("userRequired"))
      return
    }
    const request = staff
      ? () =>
          api.put(`/staff/${staff.id}`, {
            displayName: optionalString(values.displayName),
            bio: optionalString(values.bio),
            active: values.active,
          })
      : () =>
          api.post("/staff", {
            userId: values.userId,
            displayName: optionalString(values.displayName),
            bio: optionalString(values.bio),
          })
    await mutation.run(request, { successMessage: tc("saved"), onSuccess: onSaved })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{staff ? t("edit") : t("add")}</DialogTitle>
          {staff && <DialogDescription>{staff.user.email}</DialogDescription>}
        </DialogHeader>
        <FieldGroup>
          {!staff && (
            <Field data-invalid={!!userError}>
              <FieldLabel>{t("user")}</FieldLabel>
              <Select
                value={values.userId}
                onValueChange={(value) => {
                  setValues((current) => ({ ...current, userId: (value as string | null) ?? "" }))
                  setUserError(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectUser")}>
                    {values.userId
                      ? (users.find((user) => user.id === values.userId)?.name ??
                        users.find((user) => user.id === values.userId)?.email)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userError && <FieldError>{userError}</FieldError>}
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="staff-display-name">{t("displayName")}</FieldLabel>
            <Input
              id="staff-display-name"
              value={values.displayName}
              onChange={(event) => setValues({ ...values, displayName: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="staff-bio">{t("bio")}</FieldLabel>
            <Textarea id="staff-bio" value={values.bio} onChange={(event) => setValues({ ...values, bio: event.target.value })} />
          </Field>
          {staff && (
            <Field orientation="horizontal">
              <Input
                id="staff-active"
                type="checkbox"
                className="size-4"
                checked={values.active}
                onChange={(event) => setValues({ ...values, active: event.target.checked })}
              />
              <FieldLabel htmlFor="staff-active">{t("active")}</FieldLabel>
            </Field>
          )}
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
