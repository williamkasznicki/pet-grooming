"use client"

import { useMemo, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import { optionalString } from "@/lib/utils/string"
import { RolesPanel, type Permission, type Role } from "./roles-panel"

type AdminUser = {
  id: string
  email: string
  name: string | null
  phone: string | null
  roles: string[]
  createdAt: string
}

type UserValues = {
  name: string
  phone: string
}

type DialogState =
  | { mode: "closed" }
  | { mode: "edit"; user: AdminUser; busy?: boolean; busyError?: string }
  | { mode: "delete"; user: AdminUser; busy?: boolean; busyError?: string }
  | { mode: "roles"; user: AdminUser; busyRoleId?: number; busyError?: string }

export default function AdminUsersPage() {
  const t = useTranslations("admin.users")
  const tc = useTranslations("common")
  const format = useFormatter()
  const { can } = useAuth()

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useAxios<AdminUser[]>("/users", {
    throwOnError: true,
  })
  const { data: roles, isLoading: rolesLoading, refetch: refetchRoles } = useAxios<Role[]>("/roles", {
    throwOnError: true,
  })
  const { data: allPermissions } = useAxios<Permission[]>("/permissions", { throwOnError: true })
  const [tab, setTab] = useState<"users" | "roles">("users")
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })
  const [values, setValues] = useState<UserValues>({ name: "", phone: "" })
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const canManage = can(Permissions.MANAGE_USERS)

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (users ?? []).filter((user) => {
      if (roleFilter !== "all" && !user.roles.includes(roleFilter)) return false
      if (query && !`${user.name ?? ""} ${user.email}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [users, search, roleFilter])

  const isLoading = usersLoading || rolesLoading || users === undefined || roles === undefined
  const rolesByName = useMemo(() => new Map((roles ?? []).map((role) => [role.name, role])), [roles])
  const remainingRoles = useMemo(() => {
    if (dialog.mode !== "roles") return []
    const current = new Set(dialog.user.roles)
    return (roles ?? []).filter((role) => !current.has(role.name))
  }, [dialog, roles])

  const openEdit = (user: AdminUser) => {
    setValues({ name: user.name ?? "", phone: user.phone ?? "" })
    setDialog({ mode: "edit", user })
  }

  const saveUser = async () => {
    if (dialog.mode !== "edit") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.put(`/users/${dialog.user.id}`, {
        name: optionalString(values.name),
        phone: optionalString(values.phone),
      })
      setDialog({ mode: "closed" })
      refetchUsers()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const confirmDelete = async () => {
    if (dialog.mode !== "delete") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.delete(`/users/${dialog.user.id}`)
      setDialog({ mode: "closed" })
      refetchUsers()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const addRole = async () => {
    if (dialog.mode !== "roles" || selectedRoleId === "") return
    const roleId = Number(selectedRoleId)
    setDialog({ ...dialog, busyRoleId: roleId, busyError: undefined })
    try {
      await api.post(`/users/${dialog.user.id}/roles`, { roleId })
      const role = roles?.find((item) => item.id === roleId)
      setDialog({ mode: "roles", user: { ...dialog.user, roles: role ? [...dialog.user.roles, role.name] : dialog.user.roles } })
      setSelectedRoleId("")
      refetchUsers()
    } catch (err) {
      setDialog({ ...dialog, busyRoleId: undefined, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const removeRole = async (role: Role) => {
    if (dialog.mode !== "roles") return
    setDialog({ ...dialog, busyRoleId: role.id, busyError: undefined })
    try {
      await api.delete(`/users/${dialog.user.id}/roles/${role.id}`)
      setDialog({ mode: "roles", user: { ...dialog.user, roles: dialog.user.roles.filter((name) => name !== role.name) } })
      refetchUsers()
    } catch (err) {
      setDialog({ ...dialog, busyRoleId: undefined, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="users">{t("tabUsers")}</TabsTrigger>
            <TabsTrigger value="roles">{t("tabRoles")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "roles" && !isLoading && (
        <RolesPanel roles={roles ?? []} permissions={allPermissions ?? []} refetchRoles={refetchRoles} />
      )}

      {tab === "users" && (
        <>
      {/* Search + role filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          className="w-56"
          aria-label={t("search")}
        />
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter((value as string | null) ?? "all")}>
          <SelectTrigger className="w-40" aria-label={t("filterRole")}>
            <SelectValue>{roleFilter === "all" ? t("allRoles") : roleFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRoles")}</SelectItem>
            {(roles ?? []).map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("roles")}</TableHead>
              <TableHead>{t("created")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name || t("unnamed")}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format.dateTime(new Date(user.createdAt), { dateStyle: "medium" })}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                        {t("edit")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRoleId("")
                          setDialog({ mode: "roles", user })
                        }}
                      >
                        {t("manageRoles")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "delete", user })}>
                        {tc("delete")}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
        </>
      )}

      <Dialog open={dialog.mode === "edit"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
            {dialog.mode === "edit" && <DialogDescription>{dialog.user.email}</DialogDescription>}
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-name">{t("name")}</FieldLabel>
              <Input id="user-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-phone">{t("phone")}</FieldLabel>
              <Input id="user-phone" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} />
            </Field>
            {dialog.mode === "edit" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button disabled={dialog.mode === "edit" && dialog.busy} onClick={() => void saveUser()}>
                {dialog.mode === "edit" && dialog.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "roles"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("manageRoles")}</DialogTitle>
            {dialog.mode === "roles" && <DialogDescription>{dialog.user.email}</DialogDescription>}
          </DialogHeader>
          {dialog.mode === "roles" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {dialog.user.roles.map((roleName) => {
                  const role = rolesByName.get(roleName)
                  return (
                    <Badge key={roleName} variant="outline" className="gap-2">
                      {roleName}
                      {role && (
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={dialog.busyRoleId === role.id}
                          onClick={() => void removeRole(role)}
                        >
                          {t("removeRole")}
                        </Button>
                      )}
                    </Badge>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Field>
                  <FieldLabel>{t("addRole")}</FieldLabel>
                  <Select value={selectedRoleId} onValueChange={(value) => setSelectedRoleId(value ?? "")}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      {remainingRoles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button disabled={selectedRoleId === "" || dialog.busyRoleId !== undefined} onClick={() => void addRole()}>
                  {dialog.busyRoleId !== undefined ? tc("loading") : t("addRole")}
                </Button>
              </div>
              {dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "delete"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {dialog.mode === "delete" && <DialogDescription>{dialog.user.email}</DialogDescription>}
          </DialogHeader>
          {dialog.mode === "delete" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button
              variant="destructive"
              disabled={dialog.mode === "delete" && dialog.busy}
              onClick={() => void confirmDelete()}
            >
              {dialog.mode === "delete" && dialog.busy ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
