"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import { FieldError } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

type ShopSetting = {
  key: string
  value: unknown
  updatedAt: string
}

export default function AdminSettingsPage() {
  const t = useTranslations("admin.settings")
  const tc = useTranslations("common")
  const { can } = useAuth()

  const { data: settings, isLoading, refetch } = useAxios<ShopSetting[]>("/shop-settings", { throwOnError: true })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const canManage = can(Permissions.MANAGE_SETTINGS)

  useEffect(() => {
    if (!settings) return
    setDrafts(Object.fromEntries(settings.map((setting) => [setting.key, JSON.stringify(setting.value)])))
  }, [settings])

  const saveSetting = async (key: string) => {
    let value: unknown
    try {
      value = JSON.parse(drafts[key] ?? "")
    } catch {
      setErrors((errorsByKey) => ({ ...errorsByKey, [key]: t("invalidJson") }))
      setSavedKey(null)
      return
    }

    setBusyKey(key)
    setErrors((errorsByKey) => ({ ...errorsByKey, [key]: undefined }))
    setSavedKey(null)
    try {
      await api.put(`/shop-settings/${encodeURIComponent(key)}`, { value })
      setSavedKey(key)
      refetch()
    } catch (err) {
      setErrors((errorsByKey) => ({ ...errorsByKey, [key]: apiErrorMessage(err, tc("error")) }))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {isLoading || settings === undefined ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("key")}</TableHead>
              <TableHead>{t("value")}</TableHead>
              <TableHead>{t("save")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((setting) => {
              const busy = busyKey === setting.key
              return (
                <TableRow key={setting.key}>
                  <TableCell className="whitespace-nowrap font-medium">{setting.key}</TableCell>
                  <TableCell>
                    <Input
                      value={drafts[setting.key] ?? ""}
                      aria-invalid={!!errors[setting.key]}
                      disabled={!canManage || busy}
                      onChange={(event) => {
                        setDrafts((nextDrafts) => ({ ...nextDrafts, [setting.key]: event.target.value }))
                        setErrors((errorsByKey) => ({ ...errorsByKey, [setting.key]: undefined }))
                        setSavedKey(null)
                      }}
                    />
                    {errors[setting.key] && <FieldError className="mt-1">{errors[setting.key]}</FieldError>}
                    {savedKey === setting.key && <p className="text-muted-foreground mt-1 text-xs">{t("saved")}</p>}
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <Button size="sm" disabled={busy} onClick={() => void saveSetting(setting.key)}>
                        {busy ? tc("loading") : t("save")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
