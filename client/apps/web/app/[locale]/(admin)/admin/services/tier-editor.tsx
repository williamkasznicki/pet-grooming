"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { MasterDataBadge } from "@/components/master-data-badge"
import { api, apiErrorMessage } from "@/lib/api/client"
import type { MasterDataItem, Service, ServiceTier } from "@/lib/types/api"

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

type TierDraft = { priceThb: string; durationMin: string }

/**
 * Per-size price/duration editor for ONE service. Owns its drafts and errors;
 * the parent only supplies data and a refetch callback.
 */
export function TierEditor({
  service,
  sizes,
  canManage,
  onSaved,
}: {
  service: Service
  sizes: MasterDataItem[]
  canManage: boolean
  onSaved: () => void
}) {
  const t = useTranslations("admin.services")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")

  const [drafts, setDrafts] = useState<Record<number, TierDraft>>({})
  const [errors, setErrors] = useState<Record<number, string | undefined>>({})
  const [busySizeId, setBusySizeId] = useState<number | null>(null)

  const tierFor = (size: MasterDataItem): ServiceTier | undefined =>
    service.tiers.find((tier) => tier.sizeId === size.id)

  const draftFor = (size: MasterDataItem): TierDraft => {
    const tier = tierFor(size)
    return drafts[size.id] ?? { priceThb: tier?.priceThb ?? "", durationMin: tier ? String(tier.durationMin) : "" }
  }

  const updateDraft = (size: MasterDataItem, patch: Partial<TierDraft>) => {
    setDrafts((current) => ({ ...current, [size.id]: { ...draftFor(size), ...patch } }))
    setErrors((current) => ({ ...current, [size.id]: undefined }))
  }

  const save = async (size: MasterDataItem) => {
    const draft = draftFor(size)
    const durationMin = Number(draft.durationMin)
    if (!PRICE_PATTERN.test(draft.priceThb) || !Number.isInteger(durationMin) || durationMin <= 0) {
      setErrors((current) => ({ ...current, [size.id]: ta("validation.required") }))
      return
    }

    const tier = tierFor(size)
    setBusySizeId(size.id)
    setErrors((current) => ({ ...current, [size.id]: undefined }))
    try {
      if (tier) {
        await api.put(`/services/${service.id}/tiers/${tier.id}`, { priceThb: draft.priceThb, durationMin })
      } else {
        await api.post(`/services/${service.id}/tiers`, { sizeId: size.id, priceThb: draft.priceThb, durationMin })
      }
      toast.success(tc("saved"))
      onSaved()
    } catch (err) {
      setErrors((current) => ({ ...current, [size.id]: apiErrorMessage(err, tc("error")) }))
    } finally {
      setBusySizeId(null)
    }
  }

  return (
    <div className="border-t pt-3">
      <h2 className="mb-2 text-sm font-medium">{t("tiers")}</h2>
      <div className="grid gap-2">
        {sizes.map((size) => {
          const draft = draftFor(size)
          const busy = busySizeId === size.id
          const inputKey = `${service.id}:${size.id}`
          return (
            <div key={size.id} className="grid gap-2 rounded-lg border p-2 md:grid-cols-[7rem_1fr_1fr_auto] md:items-end">
              <div className="flex items-center gap-2 md:pb-2">
                <MasterDataBadge colors={size}>{size.code}</MasterDataBadge>
              </div>
              <Field data-invalid={!!errors[size.id]}>
                <FieldLabel htmlFor={`${inputKey}-price`}>{t("price")}</FieldLabel>
                <Input
                  id={`${inputKey}-price`}
                  inputMode="decimal"
                  value={draft.priceThb}
                  aria-invalid={!!errors[size.id]}
                  disabled={!canManage || busy}
                  onChange={(event) => updateDraft(size, { priceThb: event.target.value })}
                />
              </Field>
              <Field data-invalid={!!errors[size.id]}>
                <FieldLabel htmlFor={`${inputKey}-duration`}>{t("durationMin")}</FieldLabel>
                <Input
                  id={`${inputKey}-duration`}
                  inputMode="numeric"
                  value={draft.durationMin}
                  aria-invalid={!!errors[size.id]}
                  disabled={!canManage || busy}
                  onChange={(event) => updateDraft(size, { durationMin: event.target.value })}
                />
              </Field>
              {canManage && (
                <Button size="sm" disabled={busy} onClick={() => void save(size)}>
                  {busy ? tc("loading") : tc("save")}
                </Button>
              )}
              {errors[size.id] && <FieldError className="md:col-span-4">{errors[size.id]}</FieldError>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
