"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { RiDeleteBinLine, RiPencilLine } from "@remixicon/react"

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
import { FieldError } from "@workspace/ui/components/field"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { MasterDataBadge } from "@/components/master-data-badge"
import { useAxios } from "@/hooks/useAxios"
import { useMutation } from "@/hooks/useMutation"
import { api } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import { ServiceIcon } from "@/lib/service-icons"
import type { MasterDataItem, Service } from "@/lib/types/api"
import { ServiceFormDialog } from "./service-form-dialog"
import { TierEditor } from "./tier-editor"

/**
 * Services & prices — the page orchestrates: fetch, permissions, which dialog
 * is open. The form dialog and per-service tier editor own their own state.
 */

type DialogState = { mode: "closed" } | { mode: "form"; service?: Service } | { mode: "delete"; service: Service }

export default function AdminServicesPage() {
  const t = useTranslations("admin.services")
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
  const deletion = useMutation()
  const close = () => {
    deletion.reset()
    setDialog({ mode: "closed" })
  }
  const saved = () => {
    close()
    refetchServices()
  }

  const isLoading = servicesLoading || sizesLoading || services === undefined
  const canManage = can(Permissions.MANAGE_SERVICES)
  const sizesById = useMemo(() => new Map(sizes.map((size) => [size.id, size])), [sizes])

  const confirmDelete = async () => {
    if (dialog.mode !== "delete") return
    await deletion.run(() => api.delete(`/services/${dialog.service.id}`), {
      successMessage: tc("deleted"),
      onSuccess: saved,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canManage && <Button onClick={() => setDialog({ mode: "form" })}>{t("add")}</Button>}
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
            <Card key={service.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ServiceIcon service={service} className="text-primary size-5" />
                      {service.name}
                    </CardTitle>
                    {service.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">{service.description}</p>
                    )}
                  </div>
                  {service.active && <Badge variant="secondary">{t("active")}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {service.tiers.map((tier) => (
                    <MasterDataBadge key={tier.id} variant="outline" colors={sizesById.get(tier.sizeId)}>
                      {sizesById.get(tier.sizeId)?.code ?? tier.sizeId} · ฿{tier.priceThb} · {tier.durationMin} min
                    </MasterDataBadge>
                  ))}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialog({ mode: "form", service })}>
                      <RiPencilLine data-icon="inline-start" />
                      {t("edit")}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDialog({ mode: "delete", service })}>
                      <RiDeleteBinLine data-icon="inline-start" />
                      {tc("delete")}
                    </Button>
                  </div>
                )}

                <TierEditor service={service} sizes={sizes} canManage={canManage} onSaved={refetchServices} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialog.mode === "form" && (
        <ServiceFormDialog service={dialog.service ?? null} onClose={close} onSaved={saved} />
      )}

      <Dialog open={dialog.mode === "delete"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {dialog.mode === "delete" && <DialogDescription>{dialog.service.name}</DialogDescription>}
          </DialogHeader>
          {deletion.error && <FieldError>{deletion.error}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deletion.busy}>
              {deletion.busy ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
