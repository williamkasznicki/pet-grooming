"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

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

import { api, apiErrorMessage } from "@/lib/api/client"
import { usePermissions } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"
import type { Pet } from "@/lib/types/api"
import { usePets } from "./use-pets"

const petSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  breed: z.string().optional(),
  sizeId: z.number().int("validation.required").min(1, "validation.required"),
  birthDate: z.string().optional(),
  notes: z.string().max(1000, "validation.tooLong").optional(),
})

type PetValues = z.infer<typeof petSchema>

const emptyPetValues: PetValues = { name: "", breed: "", sizeId: 0, birthDate: "", notes: "" }

function petDefaults(pet?: Pet): PetValues {
  return pet
    ? {
        name: pet.name,
        breed: pet.breed ?? "",
        sizeId: pet.sizeId,
        birthDate: pet.birthDate?.slice(0, 10) ?? "",
        notes: pet.notes ?? "",
      }
    : emptyPetValues
}

function optionalString(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined
}

/** One state machine instead of open-flags + editing/deleting/error trios. */
type DialogState =
  | { mode: "closed" }
  | { mode: "form"; pet?: Pet; busyError?: string }
  | { mode: "delete"; pet: Pet; busy?: boolean; busyError?: string }

export default function PetsPage() {
  const t = useTranslations("pets")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const { can } = usePermissions()
  const { pets, sizes, sizesById, isLoading, reload } = usePets()

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" })

  const form = useForm<PetValues>({ resolver: zodResolver(petSchema), defaultValues: emptyPetValues })
  const { errors, isSubmitting } = form.formState

  const openForm = (pet?: Pet) => {
    form.reset(petDefaults(pet))
    setDialog({ mode: "form", pet })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (dialog.mode !== "form") return
    const payload = {
      name: values.name.trim(),
      breed: optionalString(values.breed),
      sizeId: values.sizeId,
      birthDate: values.birthDate || undefined,
      notes: optionalString(values.notes),
    }
    try {
      if (dialog.pet) {
        await api.put(`/pets/${dialog.pet.id}`, payload)
      } else {
        await api.post("/pets", payload)
      }
      setDialog({ mode: "closed" })
      reload()
    } catch (err) {
      setDialog({ ...dialog, busyError: apiErrorMessage(err, tc("error")) })
    }
  })

  const confirmDelete = async () => {
    if (dialog.mode !== "delete") return
    setDialog({ ...dialog, busy: true, busyError: undefined })
    try {
      await api.delete(`/pets/${dialog.pet.id}`)
      setDialog({ mode: "closed" })
      reload()
    } catch (err) {
      setDialog({ ...dialog, busy: false, busyError: apiErrorMessage(err, tc("error")) })
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Button onClick={() => openForm()}>{t("add")}</Button>
      </div>

      {isLoading || pets === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
            <Button onClick={() => openForm()}>{t("add")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => {
            const size = sizesById.get(pet.sizeId)
            return (
              <Card key={pet.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{pet.name}</CardTitle>
                    {size && (
                      <Badge
                        style={
                          size.hexBgColorCode
                            ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                            : undefined
                        }
                      >
                        {size.code}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-28 flex-col gap-3">
                  {pet.breed && <p className="text-sm">{pet.breed}</p>}
                  {pet.notes && <p className="text-muted-foreground line-clamp-4 text-sm">{pet.notes}</p>}
                  <div className="mt-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(pet)}>
                      {t("edit")}
                    </Button>
                    {can(Permissions.DELETE_PET) && (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "delete", pet })}>
                        {tc("delete")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / edit */}
      <Dialog open={dialog.mode === "form"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.mode === "form" && dialog.pet ? t("edit") : t("add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="pet-name">{t("name")}</FieldLabel>
                <Input id="pet-name" aria-invalid={!!errors.name} {...form.register("name")} />
                {errors.name?.message && <FieldError>{ta(errors.name.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.breed}>
                <FieldLabel htmlFor="pet-breed">{t("breed")}</FieldLabel>
                <Input id="pet-breed" aria-invalid={!!errors.breed} {...form.register("breed")} />
                {errors.breed?.message && <FieldError>{ta(errors.breed.message)}</FieldError>}
              </Field>
              <Controller
                control={form.control}
                name="sizeId"
                render={({ field }) => (
                  <Field data-invalid={!!errors.sizeId}>
                    <FieldLabel htmlFor="pet-size">{t("size")}</FieldLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="pet-size" className="w-full" aria-invalid={!!errors.sizeId}>
                        <SelectValue placeholder={t("sizePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size.id} value={String(size.id)}>
                            {size.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sizeId?.message && <FieldError>{ta(errors.sizeId.message)}</FieldError>}
                  </Field>
                )}
              />
              <Field data-invalid={!!errors.birthDate}>
                <FieldLabel htmlFor="pet-birth-date">{t("birthDate")}</FieldLabel>
                <Input id="pet-birth-date" type="date" aria-invalid={!!errors.birthDate} {...form.register("birthDate")} />
                {errors.birthDate?.message && <FieldError>{ta(errors.birthDate.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="pet-notes">{t("notes")}</FieldLabel>
                <Textarea id="pet-notes" aria-invalid={!!errors.notes} {...form.register("notes")} />
                {errors.notes?.message && <FieldError>{ta(errors.notes.message)}</FieldError>}
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

      {/* Delete confirm */}
      <Dialog open={dialog.mode === "delete"} onOpenChange={(open) => !open && setDialog({ mode: "closed" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {dialog.mode === "delete" && <DialogDescription>{dialog.pet.name}</DialogDescription>}
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
