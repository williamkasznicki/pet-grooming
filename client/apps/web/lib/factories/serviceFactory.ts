import { z } from "zod"

import type { Service } from "@/lib/types/api"

/**
 * Service form contract in one place: schema, inferred type, and create/edit
 * defaults. Messages are i18n keys resolved by the consuming form.
 */
export const serviceSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  description: z.string().max(1000, "validation.tooLong").optional(),
  nameTh: z.string().max(120, "validation.tooLong").optional(),
  descriptionTh: z.string().max(1000, "validation.tooLong").optional(),
  active: z.boolean().default(true),
})

export type ServiceValues = z.input<typeof serviceSchema>

export const emptyServiceValues: ServiceValues = {
  name: "",
  description: "",
  nameTh: "",
  descriptionTh: "",
  active: true,
}

export function serviceDefaults(service?: Service): ServiceValues {
  return service
    ? {
        name: service.name,
        description: service.description ?? "",
        nameTh: service.nameTh ?? "",
        descriptionTh: service.descriptionTh ?? "",
        active: service.active,
      }
    : emptyServiceValues
}
