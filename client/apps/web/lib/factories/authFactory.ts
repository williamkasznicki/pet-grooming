import { z } from "zod"

/** Auth form contracts (see petFactory.ts for the pattern). */

export const loginSchema = z.object({
  email: z.email("validation.email"),
  password: z.string().min(1, "validation.required"),
})

export type LoginValues = z.infer<typeof loginSchema>

export const emptyLoginValues: LoginValues = { email: "", password: "" }

export const registerSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  email: z.email("validation.email"),
  password: z.string().min(8, "validation.passwordMin").max(72, "validation.tooLong"),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{6,20}$/, "validation.phone")
    .or(z.literal(""))
    .optional(),
})

export type RegisterValues = z.infer<typeof registerSchema>

export const emptyRegisterValues: RegisterValues = { name: "", email: "", password: "", phone: "" }
