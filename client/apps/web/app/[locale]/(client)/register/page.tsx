"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"

const registerSchema = z.object({
  name: z.string().min(1, "validation.required").max(120, "validation.tooLong"),
  email: z.email("validation.email"),
  password: z.string().min(8, "validation.passwordMin").max(72, "validation.tooLong"),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{6,20}$/, "validation.phone")
    .or(z.literal(""))
    .optional(),
})

type RegisterValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const { register: registerAccount } = useAuth()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      })
      router.replace("/")
    } catch (err) {
      setServerError(apiErrorMessage(err, tc("error")))
    }
  })

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
                <Input id="name" aria-invalid={!!errors.name} {...form.register("name")} />
                {errors.name?.message && <FieldError>{t(errors.name.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
                {errors.email?.message && <FieldError>{t(errors.email.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                {errors.password?.message && <FieldError>{t(errors.password.message)}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="phone">{t("phone")}</FieldLabel>
                <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...form.register("phone")} />
                {errors.phone?.message && <FieldError>{t(errors.phone.message)}</FieldError>}
              </Field>
              {serverError && <FieldError>{serverError}</FieldError>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc("loading") : t("registerButton")}
              </Button>
              <p className="text-muted-foreground text-sm">
                {t("haveAccount")}{" "}
                <Link href="/login" className="underline underline-offset-4">
                  {t("loginButton")}
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
