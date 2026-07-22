import { z } from "zod"

import type { Pet } from "@/lib/types/api"

/**
 * Pet form contract in one place: schema (mirrors the server DTO rules),
 * inferred type, and default-value factory for create vs edit.
 * Messages are i18n KEYS resolved by the consuming form (auth.validation.*).
 */
export const petSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  breed: z.string().optional(),
  sizeId: z.number().int("validation.required").min(1, "validation.required"),
  birthDate: z.string().optional(),
  notes: z.string().max(1000, "validation.tooLong").optional(),
})

export type PetValues = z.infer<typeof petSchema>

export const emptyPetValues: PetValues = { name: "", breed: "", sizeId: 0, birthDate: "", notes: "" }

export function petDefaults(pet?: Pet): PetValues {
  return pet
    ? {
        name: pet.name,
        breed: pet.breed ?? "",
        sizeId: pet.sizeId,
        // input[type=date] wants yyyy-MM-dd, the API returns ISO datetimes
        birthDate: pet.birthDate?.slice(0, 10) ?? "",
        notes: pet.notes ?? "",
      }
    : emptyPetValues
}
