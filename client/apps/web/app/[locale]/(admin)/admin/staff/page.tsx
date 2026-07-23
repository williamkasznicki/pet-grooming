"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { useAxios } from "@/hooks/useAxios"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import type { AdminUser, StaffAdmin, StaffTimeOff } from "@/lib/types/api"
import { HoursDialog } from "./hours-dialog"
import { ProfileDialog } from "./profile-dialog"
import { StaffCard } from "./staff-card"
import { DeleteTimeOffDialog, TimeOffDialog } from "./time-off-dialog"

/**
 * Staff management — this page only orchestrates: data fetch, permission
 * flags, which dialog is open. Each dialog owns its form state and mutation
 * (mounted only while open, so state resets between uses).
 */

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; staff: StaffAdmin }
  | { mode: "hours"; staff: StaffAdmin }
  | { mode: "timeOff"; staff: StaffAdmin }
  | { mode: "deleteTimeOff"; staff: StaffAdmin; timeOff: StaffTimeOff }

export default function AdminStaffPage() {
  const t = useTranslations("admin.staff")
  const { can } = useAuth()

  const { data: staff, isLoading: staffLoading, refetch } = useAxios<StaffAdmin[]>("/staff/admin", {
    throwOnError: true,
  })
  const canManageStaff = can(Permissions.MANAGE_STAFF)
  const canManageUsers = can(Permissions.MANAGE_USERS)
  const { data: users, isLoading: usersLoading } = useAxios<Pick<AdminUser, "id" | "email" | "name">[]>(
    canManageUsers ? "/users" : null,
    { throwOnError: true },
  )

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })
  const close = () => setDialog({ mode: "closed" })
  const saved = () => {
    close()
    refetch()
  }

  const isLoading = staffLoading || staff === undefined || (canManageUsers && usersLoading)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canManageStaff && canManageUsers && <Button onClick={() => setDialog({ mode: "create" })}>{t("add")}</Button>}
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
          {staff.map((item) => (
            <StaffCard
              key={item.id}
              item={item}
              canManage={canManageStaff}
              onEdit={() => setDialog({ mode: "edit", staff: item })}
              onHours={() => setDialog({ mode: "hours", staff: item })}
              onAddTimeOff={() => setDialog({ mode: "timeOff", staff: item })}
              onDeleteTimeOff={(timeOff) => setDialog({ mode: "deleteTimeOff", staff: item, timeOff })}
            />
          ))}
        </div>
      )}

      {dialog.mode === "create" && (
        <ProfileDialog staff={null} users={users ?? []} onClose={close} onSaved={saved} />
      )}
      {dialog.mode === "edit" && (
        <ProfileDialog staff={dialog.staff} users={users ?? []} onClose={close} onSaved={saved} />
      )}
      {dialog.mode === "hours" && <HoursDialog staff={dialog.staff} onClose={close} onSaved={saved} />}
      {dialog.mode === "timeOff" && <TimeOffDialog staff={dialog.staff} onClose={close} onSaved={saved} />}
      {dialog.mode === "deleteTimeOff" && (
        <DeleteTimeOffDialog staff={dialog.staff} timeOff={dialog.timeOff} onClose={close} onDeleted={saved} />
      )}
    </div>
  )
}
