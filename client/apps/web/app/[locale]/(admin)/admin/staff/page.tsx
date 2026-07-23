"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { toast } from "sonner"
import { RiDeleteBinLine, RiPencilLine, RiTimeLine } from "@remixicon/react"

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import { optionalString } from "@/lib/utils/string"

type AdminUser = {
  id: string
  email: string
  name: string | null
}

type WorkingHour = {
  id: string
  weekday: number
  startMin: number
  endMin: number
}

type StaffTimeOff = {
  id: string
  isPermanent: boolean
  startsAt: string | null
  endsAt: string | null
  reason: string | null
}

type StaffResponse = {
  id: string
  userId: string
  displayName: string | null
  bio: string | null
  active: boolean
  user: {
    name: string | null
    email: string
  }
  workingHours: WorkingHour[]
  timeOffs?: StaffTimeOff[]
  timeOff?: StaffTimeOff[]
  createdAt: string
}

type ProfileValues = {
  userId: string
  displayName: string
  bio: string
  active: boolean
}

type DayDraft = {
  off: boolean
  start: string
  end: string
}

type TimeOffValues = {
  isPermanent: boolean
  startsAt: string
  endsAt: string
  reason: string
}

type DialogState =
  | { mode: "closed" }
  | { mode: "create"; busy?: boolean; busyError?: string; errors?: Partial<Record<keyof ProfileValues, string>> }
  | { mode: "edit"; staff: StaffResponse; busy?: boolean; busyError?: string }
  | { mode: "hours"; staff: StaffResponse; busy?: boolean; busyError?: string; errors?: Record<number, string | undefined> }
  | { mode: "timeOff"; staff: StaffResponse; busy?: boolean; busyError?: string; error?: string }
  | { mode: "deleteTimeOff"; staff: StaffResponse; timeOff: StaffTimeOff; busy?: boolean; busyError?: string }

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
const DEFAULT_DAY: DayDraft = { off: true, start: "09:00", end: "18:00" }

function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function timeToMinutes(value: string): number {
  const [hour = 0, minute = 0] = value.split(":").map(Number)
  return hour * 60 + minute
}

function timeOffList(staff: StaffResponse): StaffTimeOff[] {
  return staff.timeOffs ?? staff.timeOff ?? []
}

export default function AdminStaffPage() {
  const t = useTranslations("admin.staff")
  const tc = useTranslations("common")
  const format = useFormatter()
  const { can } = useAuth()

  const { data: staff, isLoading: staffLoading, refetch } = useAxios<StaffResponse[]>("/staff/admin", {
    throwOnError: true,
  })
  const canManageStaff = can(Permissions.MANAGE_STAFF)
  const canManageUsers = can(Permissions.MANAGE_USERS)
  const { data: users, isLoading: usersLoading } = useAxios<AdminUser[]>(canManageUsers ? "/users" : null, {
    throwOnError: true,
  })

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })
  const [profileValues, setProfileValues] = useState<ProfileValues>({
    userId: "",
    displayName: "",
    bio: "",
    active: true,
  })
  const [hoursDraft, setHoursDraft] = useState<Record<number, DayDraft>>(
    Object.fromEntries(WEEKDAYS.map((weekday) => [weekday, DEFAULT_DAY])) as Record<number, DayDraft>,
  )
  const [timeOffValues, setTimeOffValues] = useState<TimeOffValues>({
    isPermanent: false,
    startsAt: "",
    endsAt: "",
    reason: "",
  })

  const isLoading = staffLoading || staff === undefined || (canManageUsers && usersLoading)
  const weekdayNames = useMemo(
    () => ({
      0: t("weekdaySun"),
      1: t("weekdayMon"),
      2: t("weekdayTue"),
      3: t("weekdayWed"),
      4: t("weekdayThu"),
      5: t("weekdayFri"),
      6: t("weekdaySat"),
    }),
    [t],
  )

  const openCreate = () => {
    setProfileValues({ userId: "", displayName: "", bio: "", active: true })
    setDialog({ mode: "create" })
  }

  const openEdit = (item: StaffResponse) => {
    setProfileValues({
      userId: item.userId,
      displayName: item.displayName ?? "",
      bio: item.bio ?? "",
      active: item.active,
    })
    setDialog({ mode: "edit", staff: item })
  }

  const openHours = (item: StaffResponse) => {
    const drafts = Object.fromEntries(
      WEEKDAYS.map((weekday) => {
        const current = item.workingHours.find((entry) => entry.weekday === weekday)
        return [
          weekday,
          current
            ? { off: false, start: minutesToTime(current.startMin), end: minutesToTime(current.endMin) }
            : DEFAULT_DAY,
        ]
      }),
    ) as Record<number, DayDraft>
    setHoursDraft(drafts)
    setDialog({ mode: "hours", staff: item })
  }

  const updateDay = (weekday: number, patch: Partial<DayDraft>) => {
    setHoursDraft((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? DEFAULT_DAY), ...patch } }))
    if (dialog.mode === "hours" && dialog.errors?.[weekday]) {
      setDialog({ ...dialog, errors: { ...dialog.errors, [weekday]: undefined } })
    }
  }

  const openTimeOff = (item: StaffResponse) => {
    setTimeOffValues({ isPermanent: false, startsAt: "", endsAt: "", reason: "" })
    setDialog({ mode: "timeOff", staff: item })
  }

  const hoursSummary = (entries: WorkingHour[]): string => {
    if (entries.length === 0) return t("offAllWeek")
    const groups = new Map<string, number[]>()
    for (const entry of entries) {
      const key = `${minutesToTime(entry.startMin)}-${minutesToTime(entry.endMin)}`
      groups.set(key, [...(groups.get(key) ?? []), entry.weekday])
    }
    return [...groups.entries()]
      .map(([window, days]) => {
        const sorted = [...days].sort((a, b) => a - b)
        const first = sorted[0] ?? 0
        const last = sorted[sorted.length - 1] ?? first
        const dayLabel =
          sorted.length > 1 && last - first === sorted.length - 1
            ? `${weekdayNames[first as keyof typeof weekdayNames]}-${weekdayNames[last as keyof typeof weekdayNames]}`
            : sorted.map((day) => weekdayNames[day as keyof typeof weekdayNames]).join(", ")
        return `${dayLabel} ${window}`
      })
      .join("; ")
  }

  const saveProfile = async () => {
    if (dialog.mode !== "create" && dialog.mode !== "edit") return
    if (dialog.mode === "create" && !profileValues.userId) {
      setDialog({ ...dialog, errors: { userId: t("userRequired") } })
      return
    }
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      if (dialog.mode === "create") {
        await api.post("/staff", {
          userId: profileValues.userId,
          displayName: optionalString(profileValues.displayName),
          bio: optionalString(profileValues.bio),
        })
      } else {
        await api.put(`/staff/${dialog.staff.id}`, {
          displayName: optionalString(profileValues.displayName),
          bio: optionalString(profileValues.bio),
          active: profileValues.active,
        })
      }
      setDialog({ mode: "closed" })
      toast.success(tc("saved"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const saveHours = async () => {
    if (dialog.mode !== "hours") return
    const errors: Record<number, string | undefined> = {}
    const entries = WEEKDAYS.flatMap((weekday) => {
      const draft = hoursDraft[weekday] ?? DEFAULT_DAY
      if (draft.off) return []
      const startMin = timeToMinutes(draft.start)
      const endMin = timeToMinutes(draft.end)
      if (!draft.start || !draft.end || endMin <= startMin) {
        errors[weekday] = t("hoursInvalid")
        return []
      }
      return [{ weekday, startMin, endMin }]
    })
    if (Object.values(errors).some(Boolean)) {
      setDialog({ ...dialog, errors })
      return
    }
    setDialog({ ...dialog, busy: true, busyError: undefined, errors: undefined })
    try {
      await api.put(`/staff/${dialog.staff.id}/working-hours`, { entries })
      setDialog({ mode: "closed" })
      toast.success(tc("saved"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const addTimeOff = async () => {
    if (dialog.mode !== "timeOff") return
    if (!timeOffValues.isPermanent && (!timeOffValues.startsAt || !timeOffValues.endsAt)) {
      setDialog({ ...dialog, error: t("timeOffRangeRequired") })
      return
    }
    setDialog({ ...dialog, busy: true, busyError: undefined, error: undefined })
    try {
      await api.post(`/staff/${dialog.staff.id}/time-off`, {
        isPermanent: timeOffValues.isPermanent,
        startsAt: timeOffValues.isPermanent ? undefined : new Date(timeOffValues.startsAt).toISOString(),
        endsAt: timeOffValues.isPermanent ? undefined : new Date(timeOffValues.endsAt).toISOString(),
        reason: optionalString(timeOffValues.reason),
      })
      setDialog({ mode: "closed" })
      toast.success(tc("saved"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const deleteTimeOff = async () => {
    if (dialog.mode !== "deleteTimeOff") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.delete(`/staff/${dialog.staff.id}/time-off/${dialog.timeOff.id}`)
      setDialog({ mode: "closed" })
      toast.success(tc("deleted"))
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canManageStaff && canManageUsers && <Button onClick={openCreate}>{t("add")}</Button>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {staff.map((item) => {
            const timeOff = timeOffList(item)
            return (
              <Card key={item.id} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{item.displayName || item.user.name || item.user.email}</CardTitle>
                      <p className="text-muted-foreground mt-1 text-sm">{item.user.email}</p>
                    </div>
                    <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? t("active") : t("inactive")}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {item.bio && <p className="text-muted-foreground line-clamp-3 text-sm">{item.bio}</p>}
                  <div>
                    <p className="text-sm font-medium">{t("weeklyHours")}</p>
                    <p className="text-muted-foreground mt-1 text-sm">{hoursSummary(item.workingHours)}</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{t("timeOff")}</p>
                      {canManageStaff && (
                        <Button variant="outline" size="xs" onClick={() => openTimeOff(item)}>
                          {t("addTimeOff")}
                        </Button>
                      )}
                    </div>
                    {timeOff.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t("noTimeOff")}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {timeOff.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm">
                            <span>
                              {entry.isPermanent
                                ? t("permanent")
                                : `${entry.startsAt ? format.dateTime(new Date(entry.startsAt), { dateStyle: "short", timeStyle: "short" }) : ""} - ${entry.endsAt ? format.dateTime(new Date(entry.endsAt), { dateStyle: "short", timeStyle: "short" }) : ""}`}
                              {entry.reason && <span className="text-muted-foreground"> · {entry.reason}</span>}
                            </span>
                            {canManageStaff && (
                              <Button
                                variant="destructive"
                                size="icon-xs"
                                aria-label={tc("delete")}
                                onClick={() => setDialog({ mode: "deleteTimeOff", staff: item, timeOff: entry })}
                              >
                                <RiDeleteBinLine />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {canManageStaff && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <RiPencilLine data-icon="inline-start" />
                        {t("edit")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openHours(item)}>
                        <RiTimeLine data-icon="inline-start" />
                        {t("editHours")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialog.mode === "create"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            {canManageUsers && (
              <Field data-invalid={dialog.mode === "create" && !!dialog.errors?.userId}>
                <FieldLabel>{t("user")}</FieldLabel>
                <Select
                  value={profileValues.userId}
                  onValueChange={(value) => {
                    setProfileValues((current) => ({ ...current, userId: value ?? "" }))
                    if (dialog.mode === "create" && dialog.errors?.userId) setDialog({ ...dialog, errors: undefined })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dialog.mode === "create" && dialog.errors?.userId && <FieldError>{dialog.errors.userId}</FieldError>}
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="staff-display-name">{t("displayName")}</FieldLabel>
              <Input
                id="staff-display-name"
                value={profileValues.displayName}
                onChange={(event) => setProfileValues({ ...profileValues, displayName: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-bio">{t("bio")}</FieldLabel>
              <Textarea id="staff-bio" value={profileValues.bio} onChange={(event) => setProfileValues({ ...profileValues, bio: event.target.value })} />
            </Field>
            {dialog.mode === "create" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button disabled={dialog.mode === "create" && dialog.busy} onClick={() => void saveProfile()}>
                {dialog.mode === "create" && dialog.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "edit"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
            {dialog.mode === "edit" && <DialogDescription>{dialog.staff.user.email}</DialogDescription>}
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="staff-edit-display-name">{t("displayName")}</FieldLabel>
              <Input
                id="staff-edit-display-name"
                value={profileValues.displayName}
                onChange={(event) => setProfileValues({ ...profileValues, displayName: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-edit-bio">{t("bio")}</FieldLabel>
              <Textarea id="staff-edit-bio" value={profileValues.bio} onChange={(event) => setProfileValues({ ...profileValues, bio: event.target.value })} />
            </Field>
            <Field orientation="horizontal">
              <Input
                id="staff-active"
                type="checkbox"
                className="size-4"
                checked={profileValues.active}
                onChange={(event) => setProfileValues({ ...profileValues, active: event.target.checked })}
              />
              <FieldLabel htmlFor="staff-active">{t("active")}</FieldLabel>
            </Field>
            {dialog.mode === "edit" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button disabled={dialog.mode === "edit" && dialog.busy} onClick={() => void saveProfile()}>
                {dialog.mode === "edit" && dialog.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "hours"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editHours")}</DialogTitle>
            {dialog.mode === "hours" && <DialogDescription>{dialog.staff.displayName || dialog.staff.user.email}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-3">
            {WEEKDAYS.map((weekday) => {
              const draft = hoursDraft[weekday] ?? DEFAULT_DAY
              return (
                <div key={weekday} className="grid gap-2 border p-3 sm:grid-cols-[7rem_5rem_1fr] sm:items-center">
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
                  {dialog.mode === "hours" && dialog.errors?.[weekday] && <FieldError className="sm:col-span-3">{dialog.errors[weekday]}</FieldError>}
                </div>
              )
            })}
          </div>
          {dialog.mode === "hours" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button disabled={dialog.mode === "hours" && dialog.busy} onClick={() => void saveHours()}>
              {dialog.mode === "hours" && dialog.busy ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "timeOff"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTimeOff")}</DialogTitle>
            {dialog.mode === "timeOff" && <DialogDescription>{dialog.staff.displayName || dialog.staff.user.email}</DialogDescription>}
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal">
              <Input
                id="time-off-permanent"
                type="checkbox"
                className="size-4"
                checked={timeOffValues.isPermanent}
                onChange={(event) => setTimeOffValues({ ...timeOffValues, isPermanent: event.target.checked })}
              />
              <FieldLabel htmlFor="time-off-permanent">{t("permanent")}</FieldLabel>
            </Field>
            {!timeOffValues.isPermanent && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="time-off-start">{t("startsAt")}</FieldLabel>
                  <Input
                    id="time-off-start"
                    type="datetime-local"
                    value={timeOffValues.startsAt}
                    onChange={(event) => setTimeOffValues({ ...timeOffValues, startsAt: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="time-off-end">{t("endsAt")}</FieldLabel>
                  <Input
                    id="time-off-end"
                    type="datetime-local"
                    value={timeOffValues.endsAt}
                    onChange={(event) => setTimeOffValues({ ...timeOffValues, endsAt: event.target.value })}
                  />
                </Field>
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="time-off-reason">{t("reason")}</FieldLabel>
              <Textarea
                id="time-off-reason"
                value={timeOffValues.reason}
                onChange={(event) => setTimeOffValues({ ...timeOffValues, reason: event.target.value })}
              />
            </Field>
            {dialog.mode === "timeOff" && dialog.error && <FieldError>{dialog.error}</FieldError>}
            {dialog.mode === "timeOff" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button disabled={dialog.mode === "timeOff" && dialog.busy} onClick={() => void addTimeOff()}>
                {dialog.mode === "timeOff" && dialog.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "deleteTimeOff"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTimeOffConfirm")}</DialogTitle>
          </DialogHeader>
          {dialog.mode === "deleteTimeOff" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button
              variant="destructive"
              disabled={dialog.mode === "deleteTimeOff" && dialog.busy}
              onClick={() => void deleteTimeOff()}
            >
              {dialog.mode === "deleteTimeOff" && dialog.busy ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

