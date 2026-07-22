"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import type { MasterDataItem, Pet } from "@/lib/types/api"

const petSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  breed: z.string().optional(),
  sizeId: z.number().int("validation.required").min(1, "validation.required"),
  birthDate: z.string().optional(),
  notes: z.string().max(1000, "validation.tooLong").optional(),
})

type PetValues = z.infer<typeof petSchema>

const emptyPetValues: PetValues = {
  name: "",
  breed: "",
  sizeId: 0,
  birthDate: "",
  notes: "",
}

function petDefaults(pet?: Pet): PetValues {
  return pet
    ? {
        name: pet.name,
        breed: pet.breed ?? "",
        sizeId: pet.sizeId,
        birthDate: pet.birthDate ?? "",
        notes: pet.notes ?? "",
      }
    : emptyPetValues
}

function optionalString(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined
}

export default function PetsPage() {
  const t = useTranslations("pets")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const { can } = usePermissions()

  const [pets, setPets] = useState<Pet[] | null>(null)
  const [sizes, setSizes] = useState<MasterDataItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [petDialogOpen, setPetDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [deletingPet, setDeletingPet] = useState<Pet | null>(null)
  const [deleting, setDeleting] = useState(false)

  const form = useForm<PetValues>({
    resolver: zodResolver(petSchema),
    defaultValues: emptyPetValues,
  })
  const { errors, isSubmitting } = form.formState

  const sizesById = useMemo(() => new Map(sizes.map((size) => [size.id, size])), [sizes])

  const loadPets = useCallback(async () => {
    try {
      const [petsRes, sizesRes] = await Promise.all([
        api.get<Pet[]>("/pets"),
        api.get<MasterDataItem[]>("/master-data/pet-sizes"),
      ])
      setLoadError(null)
      setPets(petsRes.data)
      setSizes(sizesRes.data)
    } catch (err) {
      setLoadError(apiErrorMessage(err, tc("error")))
      setPets([])
    }
  }, [tc])

  useEffect(() => {
    let ignore = false
    void Promise.all([api.get<Pet[]>("/pets"), api.get<MasterDataItem[]>("/master-data/pet-sizes")])
      .then(([petsRes, sizesRes]) => {
        if (ignore) return
        setLoadError(null)
        setPets(petsRes.data)
        setSizes(sizesRes.data)
      })
      .catch((err: unknown) => {
        if (ignore) return
        setLoadError(apiErrorMessage(err, tc("error")))
        setPets([])
      })
    return () => {
      ignore = true
    }
  }, [tc])

  const openPetDialog = (pet?: Pet) => {
    setEditingPet(pet ?? null)
    setFormError(null)
    form.reset(petDefaults(pet))
    setPetDialogOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const payload = {
      name: values.name.trim(),
      breed: optionalString(values.breed),
      sizeId: values.sizeId,
      birthDate: values.birthDate || undefined,
      notes: optionalString(values.notes),
    }

    try {
      if (editingPet) {
        await api.put(`/pets/${editingPet.id}`, payload)
      } else {
        await api.post("/pets", payload)
      }
      setPetDialogOpen(false)
      await loadPets()
    } catch (err) {
      setFormError(apiErrorMessage(err, tc("error")))
    }
  })

  const confirmDelete = async () => {
    if (!deletingPet) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/pets/${deletingPet.id}`)
      setDeleteDialogOpen(false)
      setDeletingPet(null)
      await loadPets()
    } catch (err) {
      setDeleteError(apiErrorMessage(err, tc("error")))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <Button onClick={() => openPetDialog()}>{t("add")}</Button>
      </div>

      {loadError && <p className="text-destructive mb-4 text-sm">{loadError}</p>}

      {pets === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
            <Button onClick={() => openPetDialog()}>{t("add")}</Button>
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
                    <Button variant="outline" size="sm" onClick={() => openPetDialog(pet)}>
                      {t("edit")}
                    </Button>
                    {can(Permissions.DELETE_PET) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingPet(pet)
                          setDeleteError(null)
                          setDeleteDialogOpen(true)
                        }}
                      >
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

      <Dialog
        open={petDialogOpen}
        onOpenChange={(open) => {
          setPetDialogOpen(open)
          if (!open) setEditingPet(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPet ? t("edit") : t("add")}</DialogTitle>
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
                    <Select value={field.value ? String(field.value) : ""} onValueChange={(value) => field.onChange(Number(value))}>
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
              {formError && <FieldError>{formError}</FieldError>}
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

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeletingPet(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            {deletingPet && <DialogDescription>{deletingPet.name}</DialogDescription>}
          </DialogHeader>
          {deleteError && <FieldError>{deleteError}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{tc("cancel")}</DialogClose>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
