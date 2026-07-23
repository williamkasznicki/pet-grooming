"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

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
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import type { MasterDataItem } from "@/lib/types/api"
import { optionalString } from "@/lib/utils/string"

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

type SizeValues = {
  code: string
  minWeightKg: string
  maxWeightKg: string
  hexBgColorCode: string
  hexTextColorCode: string
  desc: string
  isActive: boolean
}

type DialogState =
  | { mode: "closed" }
  | { mode: "form"; size?: MasterDataItem; busy?: boolean; busyError?: string; errors?: Partial<Record<keyof SizeValues, string>> }
  | { mode: "delete"; size: MasterDataItem; busy?: boolean; busyError?: string }

const emptyValues: SizeValues = {
  code: "",
  minWeightKg: "",
  maxWeightKg: "",
  hexBgColorCode: "#E8F4EF",
  hexTextColorCode: "#1F3D32",
  desc: "",
  isActive: true,
}

function defaults(size?: MasterDataItem): SizeValues {
  return size
    ? {
        code: size.code,
        minWeightKg: size.minWeightKg ?? "",
        maxWeightKg: size.maxWeightKg ?? "",
        hexBgColorCode: size.hexBgColorCode ?? "#E8F4EF",
        hexTextColorCode: size.hexTextColorCode ?? "#1F3D32",
        desc: size.desc ?? "",
        isActive: size.isActive,
      }
    : emptyValues
}

function rangeLabel(size: MasterDataItem): string {
  const min = Number(size.minWeightKg ?? 0)
  if (size.maxWeightKg === null) return `${min}+ kg`
  return `${min}-${Number(size.maxWeightKg)} kg`
}

export default function AdminSizesPage() {
  const t = useTranslations("admin.sizes")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const { can } = useAuth()

  const { data: sizes, isLoading, refetch } = useAxios<MasterDataItem[]>("/master-data/pet-sizes/all", {
    throwOnError: true,
  })
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })
  const [values, setValues] = useState<SizeValues>(emptyValues)
  const canManage = can(Permissions.MANAGE_SERVICES)

  const sorted = useMemo(
    () => [...(sizes ?? [])].sort((a, b) => Number(a.minWeightKg ?? 0) - Number(b.minWeightKg ?? 0)),
    [sizes],
  )

  const openForm = (size?: MasterDataItem) => {
    setValues(defaults(size))
    setDialog({ mode: "form", size })
  }

  const validate = (): Partial<Record<keyof SizeValues, string>> => {
    const errors: Partial<Record<keyof SizeValues, string>> = {}
    const min = Number(values.minWeightKg)
    const max = values.maxWeightKg === "" ? null : Number(values.maxWeightKg)
    if (!values.code.trim()) errors.code = ta("validation.required")
    if (values.minWeightKg === "" || !Number.isFinite(min) || min < 0) errors.minWeightKg = ta("validation.required")
    if (max !== null && (!Number.isFinite(max) || max <= min)) errors.maxWeightKg = t("maxAfterMin")
    if (values.hexBgColorCode && !HEX_PATTERN.test(values.hexBgColorCode)) errors.hexBgColorCode = t("hexInvalid")
    if (values.hexTextColorCode && !HEX_PATTERN.test(values.hexTextColorCode)) errors.hexTextColorCode = t("hexInvalid")
    return errors
  }

  const saveSize = async () => {
    if (dialog.mode !== "form") return
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setDialog({ ...dialog, errors })
      return
    }
    setDialog({ ...dialog, busy: true, busyError: undefined, errors: undefined })
    const payload = {
      code: values.code.trim(),
      minWeightKg: Number(values.minWeightKg),
      maxWeightKg: values.maxWeightKg === "" ? undefined : Number(values.maxWeightKg),
      hexBgColorCode: optionalString(values.hexBgColorCode),
      hexTextColorCode: optionalString(values.hexTextColorCode),
      desc: optionalString(values.desc),
      isActive: values.isActive,
    }
    try {
      if (dialog.size) {
        await api.put(`/master-data/pet-sizes/${dialog.size.id}`, payload)
      } else {
        await api.post("/master-data/pet-sizes", payload)
      }
      setDialog({ mode: "closed" })
      refetch()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const confirmDelete = async () => {
    if (dialog.mode !== "delete") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.delete(`/master-data/pet-sizes/${dialog.size.id}`)
      setDialog({ mode: "closed" })
      refetch()
    } catch (err) {
      setDialog({
        ...dialog,
        busy: false,
        busyError: `${apiErrorMessage(err, tc("error"))} ${t("deleteInUseHint")}`,
      })
    }
  }

  const setField = <K extends keyof SizeValues>(key: K, value: SizeValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    if (dialog.mode === "form" && dialog.errors?.[key]) {
      setDialog({ ...dialog, errors: { ...dialog.errors, [key]: undefined } })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canManage && <Button onClick={() => openForm()}>{t("add")}</Button>}
      </div>

      {isLoading || sizes === undefined ? (
        <Skeleton className="h-64" />
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("range")}</TableHead>
              <TableHead>{t("preview")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((size) => (
              <TableRow key={size.id}>
                <TableCell className="font-medium">{size.code}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{rangeLabel(size)}</TableCell>
                <TableCell>
                  <Badge
                    style={
                      size.hexBgColorCode
                        ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                        : undefined
                    }
                  >
                    {size.code}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-sm">{size.desc}</TableCell>
                <TableCell>
                  <Badge variant={size.isActive ? "secondary" : "outline"}>{size.isActive ? t("active") : t("inactive")}</Badge>
                </TableCell>
                <TableCell>
                  {canManage && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openForm(size)}>
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "delete", size })}>
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

      <Dialog open={dialog.mode === "form"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "form" && dialog.size ? t("edit") : t("add")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={dialog.mode === "form" && !!dialog.errors?.code}>
              <FieldLabel htmlFor="size-code">{t("code")}</FieldLabel>
              <Input id="size-code" value={values.code} onChange={(event) => setField("code", event.target.value)} />
              {dialog.mode === "form" && dialog.errors?.code && <FieldError>{dialog.errors.code}</FieldError>}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={dialog.mode === "form" && !!dialog.errors?.minWeightKg}>
                <FieldLabel htmlFor="size-min">{t("min")}</FieldLabel>
                <Input
                  id="size-min"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.minWeightKg}
                  onChange={(event) => setField("minWeightKg", event.target.value)}
                />
                {dialog.mode === "form" && dialog.errors?.minWeightKg && <FieldError>{dialog.errors.minWeightKg}</FieldError>}
              </Field>
              <Field data-invalid={dialog.mode === "form" && !!dialog.errors?.maxWeightKg}>
                <FieldLabel htmlFor="size-max">{t("max")}</FieldLabel>
                <Input
                  id="size-max"
                  type="number"
                  min="0"
                  step="0.1"
                  value={values.maxWeightKg}
                  onChange={(event) => setField("maxWeightKg", event.target.value)}
                />
                {dialog.mode === "form" && dialog.errors?.maxWeightKg && <FieldError>{dialog.errors.maxWeightKg}</FieldError>}
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={dialog.mode === "form" && !!dialog.errors?.hexBgColorCode}>
                <FieldLabel htmlFor="size-bg">{t("bgColor")}</FieldLabel>
                <Input
                  id="size-bg"
                  pattern="#[0-9A-Fa-f]{6}"
                  value={values.hexBgColorCode}
                  onChange={(event) => setField("hexBgColorCode", event.target.value)}
                />
                {dialog.mode === "form" && dialog.errors?.hexBgColorCode && <FieldError>{dialog.errors.hexBgColorCode}</FieldError>}
              </Field>
              <Field data-invalid={dialog.mode === "form" && !!dialog.errors?.hexTextColorCode}>
                <FieldLabel htmlFor="size-text">{t("textColor")}</FieldLabel>
                <Input
                  id="size-text"
                  pattern="#[0-9A-Fa-f]{6}"
                  value={values.hexTextColorCode}
                  onChange={(event) => setField("hexTextColorCode", event.target.value)}
                />
                {dialog.mode === "form" && dialog.errors?.hexTextColorCode && <FieldError>{dialog.errors.hexTextColorCode}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="size-desc">{t("description")}</FieldLabel>
              <Textarea id="size-desc" value={values.desc} onChange={(event) => setField("desc", event.target.value)} />
            </Field>
            <Field orientation="horizontal">
              <Input
                id="size-active"
                type="checkbox"
                className="size-4"
                checked={values.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
              />
              <FieldLabel htmlFor="size-active">{t("active")}</FieldLabel>
            </Field>
            {dialog.mode === "form" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button disabled={dialog.mode === "form" && dialog.busy} onClick={() => void saveSize()}>
                {dialog.mode === "form" && dialog.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "delete"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {dialog.mode === "delete" && <DialogDescription>{dialog.size.code}</DialogDescription>}
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
