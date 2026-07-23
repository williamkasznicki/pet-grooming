"use client"

import { useFormatter, useTranslations } from "next-intl"
import { RiDeleteBinLine, RiPencilLine, RiTimeLine } from "@remixicon/react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import type { StaffAdmin, StaffTimeOff, WorkingHour } from "@/lib/types/api"
import { formatMinutesOfDay } from "@/lib/utils/date"

export function timeOffList(staff: StaffAdmin): StaffTimeOff[] {
  return staff.timeOffs ?? staff.timeOff ?? []
}

/** One groomer profile: identity, weekly-hours summary, time-off list, actions. */
export function StaffCard({
  item,
  canManage,
  onEdit,
  onHours,
  onAddTimeOff,
  onDeleteTimeOff,
}: {
  item: StaffAdmin
  canManage: boolean
  onEdit: () => void
  onHours: () => void
  onAddTimeOff: () => void
  onDeleteTimeOff: (timeOff: StaffTimeOff) => void
}) {
  const t = useTranslations("admin.staff")
  const tc = useTranslations("common")
  const format = useFormatter()

  const weekdayNames: Record<number, string> = {
    0: t("weekdaySun"),
    1: t("weekdayMon"),
    2: t("weekdayTue"),
    3: t("weekdayWed"),
    4: t("weekdayThu"),
    5: t("weekdayFri"),
    6: t("weekdaySat"),
  }

  /** "Mon-Fri 09:00-18:00; Sat 10:00-15:00" — groups identical windows. */
  const hoursSummary = (entries: WorkingHour[]): string => {
    if (entries.length === 0) return t("offAllWeek")
    const groups = new Map<string, number[]>()
    for (const entry of entries) {
      const key = `${formatMinutesOfDay(entry.startMin)}-${formatMinutesOfDay(entry.endMin)}`
      groups.set(key, [...(groups.get(key) ?? []), entry.weekday])
    }
    return [...groups.entries()]
      .map(([window, days]) => {
        const sorted = [...days].sort((a, b) => a - b)
        const first = sorted[0] ?? 0
        const last = sorted[sorted.length - 1] ?? first
        const dayLabel =
          sorted.length > 1 && last - first === sorted.length - 1
            ? `${weekdayNames[first]}-${weekdayNames[last]}`
            : sorted.map((day) => weekdayNames[day]).join(", ")
        return `${dayLabel} ${window}`
      })
      .join("; ")
  }

  const timeOff = timeOffList(item)

  return (
    <Card size="sm">
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
            {canManage && (
              <Button variant="outline" size="xs" onClick={onAddTimeOff}>
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
                  {canManage && (
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      aria-label={tc("delete")}
                      onClick={() => onDeleteTimeOff(entry)}
                    >
                      <RiDeleteBinLine />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <RiPencilLine data-icon="inline-start" />
              {t("edit")}
            </Button>
            <Button variant="outline" size="sm" onClick={onHours}>
              <RiTimeLine data-icon="inline-start" />
              {t("editHours")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
