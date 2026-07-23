"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import { serviceDefaults, serviceSchema, type ServiceValues } from "@/lib/factories/serviceFactory"
import { SERVICE_ICONS, SERVICE_ICON_KEYS, type ServiceIconKey } from "@/lib/service-icons"
import type { Service } from "@/lib/types/api"
import { optionalString } from "@/lib/utils/string"

/** Create/edit service basics (en+th strings, icon, active). Mounted only while open. */
export function ServiceFormDialog({
  service,
  onClose,
  onSaved,
}: {
  service: Service | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("admin.services")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const mutation = useMutation()

  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: serviceDefaults(service ?? undefined),
  })
  const { errors, isSubmitting } = form.formState
  // useWatch instead of form.watch: safe under the React Compiler
  const iconValue = useWatch({ control: form.control, name: "icon" })

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: optionalString(values.description),
      nameTh: optionalString(values.nameTh),
      descriptionTh: optionalString(values.descriptionTh),
      icon: optionalString(values.icon),
      active: values.active,
    }
    const request = service ? () => api.put(`/services/${service.id}`, payload) : () => api.post("/services", payload)
    await mutation.run(request, { successMessage: tc("saved"), onSuccess: onSaved })
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? t("edit") : t("add")}</DialogTitle>
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
              <Textarea id="service-description" aria-invalid={!!errors.description} {...form.register("description")} />
              {errors.description?.message && <FieldError>{ta(errors.description.message)}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.nameTh}>
              <FieldLabel htmlFor="service-name-th">{t("nameTh")}</FieldLabel>
              <Input id="service-name-th" aria-invalid={!!errors.nameTh} {...form.register("nameTh")} />
              {errors.nameTh?.message && <FieldError>{ta(errors.nameTh.message)}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.descriptionTh}>
              <FieldLabel htmlFor="service-description-th">{t("descriptionTh")}</FieldLabel>
              <Textarea
                id="service-description-th"
                aria-invalid={!!errors.descriptionTh}
                {...form.register("descriptionTh")}
              />
              {errors.descriptionTh?.message && <FieldError>{ta(errors.descriptionTh.message)}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("icon")}</FieldLabel>
              <Select
                value={iconValue || "none"}
                onValueChange={(value) =>
                  form.setValue("icon", value === "none" || value === null ? "" : (value as string))
                }
              >
                <SelectTrigger aria-label={t("icon")}>
                  {/* Explicit label: Base UI only learns item labels after the popup first mounts */}
                  <SelectValue>
                    {(() => {
                      const current = iconValue
                      if (!current || !(current in SERVICE_ICONS)) return t("iconNone")
                      const Icon = SERVICE_ICONS[current as ServiceIconKey]
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className="text-primary size-4" aria-hidden />
                          {current}
                        </span>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("iconNone")}</SelectItem>
                  {SERVICE_ICON_KEYS.map((key) => {
                    const Icon = SERVICE_ICONS[key]
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="text-primary size-4" aria-hidden />
                          {key}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal" data-invalid={!!errors.active}>
              <Input id="service-active" type="checkbox" className="size-4" {...form.register("active")} />
              <FieldLabel htmlFor="service-active">{t("active")}</FieldLabel>
              {errors.active?.message && <FieldError>{ta(errors.active.message)}</FieldError>}
            </Field>
            {mutation.error && <FieldError>{mutation.error}</FieldError>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
              <Button type="submit" disabled={isSubmitting || mutation.busy}>
                {isSubmitting || mutation.busy ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
