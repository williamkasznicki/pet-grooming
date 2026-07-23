"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"

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
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import {
  emptyServiceValues,
  serviceDefaults,
  serviceSchema,
  type ServiceValues,
} from "@/lib/factories/serviceFactory"
import { Permissions } from "@/lib/permissions"
import type { MasterDataItem, Service, ServiceTier } from "@/lib/types/api"
import { optionalString } from "@/lib/utils/string"

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

type DialogState =
  | { mode: "closed" }
  | { mode: "form"; service?: Service; busyError?: string }
  | { mode: "delete"; service: Service; busy?: boolean; busyError?: string }

type TierDraft = {
  priceThb: string
  durationMin: string
}

export default function AdminServicesPage() {
  const t = useTranslations("admin.services")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const { can } = useAuth()

  const {
    data: services,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useAxios<Service[]>("/services", { throwOnError: true })
  const { data: sizes = [], isLoading: sizesLoading } = useAxios<MasterDataItem[]>("/master-data/pet-sizes", {
    throwOnError: true,
  })

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierDraft>>({})
  const [tierErrors, setTierErrors] = useState<Record<string, string | undefined>>({})
  const [tierBusyKey, setTierBusyKey] = useState<string | null>(null)

  const form = useForm<ServiceValues>({ resolver: zodResolver(serviceSchema), defaultValues: emptyServiceValues })
  const { errors, isSubmitting } = form.formState

  const isLoading = servicesLoading || sizesLoading || services === undefined
  const canManage = can(Permissions.MANAGE_SERVICES)

  const sizesById = useMemo(() => new Map(sizes.map((size) => [size.id, size])), [sizes])

  const openForm = (service?: Service) => {
    form.reset(serviceDefaults(service))
    setDialog({ mode: "form", service })
  }

  const tierKey = (service: Service, size: MasterDataItem) => `${service.id}:${size.id}`

  const tierFor = (service: Service, size: MasterDataItem): ServiceTier | undefined =>
    service.tiers.find((tier) => tier.sizeId === size.id)

  const tierDraftFor = (service: Service, size: MasterDataItem): TierDraft => {
    const key = tierKey(service, size)
    const tier = tierFor(service, size)
    return tierDrafts[key] ?? { priceThb: tier?.priceThb ?? "", durationMin: tier ? String(tier.durationMin) : "" }
  }

  const updateTierDraft = (service: Service, size: MasterDataItem, patch: Partial<TierDraft>) => {
    const key = tierKey(service, size)
    setTierDrafts((drafts) => ({ ...drafts, [key]: { ...tierDraftFor(service, size), ...patch } }))
    setTierErrors((errorsByKey) => ({ ...errorsByKey, [key]: undefined }))
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (dialog.mode !== "form") return
    const payload = {
      name: values.name.trim(),
      description: optionalString(values.description),
      active: values.active,
    }
    try {
      if (dialog.service) {
        await api.put(`/services/${dialog.service.id}`, payload)
      } else {
        await api.post("/services", payload)
      }
      setDialog({ mode: "closed" })
      refetchServices()
    } catch (err) {
      setDialog({ ...dialog, busyError: apiErrorMessage(err, tc("error")) })
    }
  })

  const confirmDelete = async () => {
    if (dialog.mode !== "delete") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.delete(`/services/${dialog.service.id}`)
      setDialog({ mode: "closed" })
      refetchServices()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  const saveTier = async (service: Service, size: MasterDataItem) => {
    const key = tierKey(service, size)
    const draft = tierDraftFor(service, size)
    const durationMin = Number(draft.durationMin)
    if (!PRICE_PATTERN.test(draft.priceThb) || !Number.isInteger(durationMin) || durationMin <= 0) {
      setTierErrors((errorsByKey) => ({ ...errorsByKey, [key]: ta("validation.required") }))
      return
    }

    const tier = tierFor(service, size)
    setTierBusyKey(key)
    setTierErrors((errorsByKey) => ({ ...errorsByKey, [key]: undefined }))
    try {
      if (tier) {
        await api.put(`/services/${service.id}/tiers/${tier.id}`, {
          priceThb: draft.priceThb,
          durationMin,
        })
      } else {
        await api.post(`/services/${service.id}/tiers`, {
          sizeId: size.id,
          priceThb: draft.priceThb,
          durationMin,
        })
      }
      refetchServices()
    } catch (err) {
      setTierErrors((errorsByKey) => ({ ...errorsByKey, [key]: apiErrorMessage(err, tc("error")) }))
    } finally {
      setTierBusyKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canManage && <Button onClick={() => openForm()}>{t("add")}</Button>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    {service.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">{service.description}</p>
                    )}
                  </div>
                  {service.active && <Badge variant="secondary">{t("active")}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {service.tiers.map((tier) => {
                    const size = sizesById.get(tier.sizeId)
                    return (
                      <Badge
                        key={tier.id}
                        variant="outline"
                        style={
                          size?.hexBgColorCode
                            ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                            : undefined
                        }
                      >
                        {size?.code ?? tier.sizeId} · ฿{tier.priceThb} · {tier.durationMin} min
                      </Badge>
                    )
                  })}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(service)}>
                      {t("edit")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "delete", service })}>
                      {tc("delete")}
                    </Button>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h2 className="mb-3 text-sm font-medium">{t("tiers")}</h2>
                  <div className="grid gap-3">
                    {sizes.map((size) => {
                      const key = tierKey(service, size)
                      const draft = tierDraftFor(service, size)
                      const busy = tierBusyKey === key
                      return (
                        <div key={size.id} className="grid gap-2 border p-3 md:grid-cols-[8rem_1fr_1fr_auto] md:items-end">
                          <div className="flex items-center gap-2 md:pb-2">
                            <Badge
                              style={
                                size.hexBgColorCode
                                  ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                                  : undefined
                              }
                            >
                              {size.code}
                            </Badge>
                          </div>
                          <Field data-invalid={!!tierErrors[key]}>
                            <FieldLabel htmlFor={`${key}-price`}>{t("price")}</FieldLabel>
                            <Input
                              id={`${key}-price`}
                              inputMode="decimal"
                              value={draft.priceThb}
                              aria-invalid={!!tierErrors[key]}
                              disabled={!canManage || busy}
                              onChange={(event) => updateTierDraft(service, size, { priceThb: event.target.value })}
                            />
                          </Field>
                          <Field data-invalid={!!tierErrors[key]}>
                            <FieldLabel htmlFor={`${key}-duration`}>{t("durationMin")}</FieldLabel>
                            <Input
                              id={`${key}-duration`}
                              inputMode="numeric"
                              value={draft.durationMin}
                              aria-invalid={!!tierErrors[key]}
                              disabled={!canManage || busy}
                              onChange={(event) => updateTierDraft(service, size, { durationMin: event.target.value })}
                            />
                          </Field>
                          {canManage && (
                            <Button size="sm" disabled={busy} onClick={() => void saveTier(service, size)}>
                              {busy ? tc("loading") : tc("save")}
                            </Button>
                          )}
                          {tierErrors[key] && <FieldError className="md:col-span-4">{tierErrors[key]}</FieldError>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog.mode === "form"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "form" && dialog.service ? t("edit") : t("add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="service-name">{t("name")}</FieldLabel>
                <Input id="service-name" aria-invalid={!!errors.name} {...form.register("name")} />
                {errors.name?.message && <FieldError>{ta(errors.name.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="service-description">{t("description")}</FieldLabel>
                <Textarea
                  id="service-description"
                  aria-invalid={!!errors.description}
                  {...form.register("description")}
                />
                {errors.description?.message && <FieldError>{ta(errors.description.message)}</FieldError>}
              </Field>
              <Field orientation="horizontal" data-invalid={!!errors.active}>
                <Input id="service-active" type="checkbox" className="size-4" {...form.register("active")} />
                <FieldLabel htmlFor="service-active">{t("active")}</FieldLabel>
                {errors.active?.message && <FieldError>{ta(errors.active.message)}</FieldError>}
              </Field>
              {dialog.mode === "form" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tc("loading") : tc("save")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.mode === "delete"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {dialog.mode === "delete" && <DialogDescription>{dialog.service.name}</DialogDescription>}
          </DialogHeader>
          {dialog.mode === "delete" && dialog.busyError && <FieldError>{dialog.busyError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={dialog.mode === "delete" && dialog.busy}
            >
              {dialog.mode === "delete" && dialog.busy ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
