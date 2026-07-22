"use client"

import { Suspense, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"

const loginSchema = z.object({
  email: z.email("validation.email"),
  password: z.string().min(1, "validation.required"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    // useSearchParams requires a Suspense boundary during prerendering
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      router.replace(searchParams.get("next") ?? "/")
    } catch (err) {
      setServerError(apiErrorMessage(err, tc("error")))
    }
  })

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <FieldGroup>
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
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                {errors.password?.message && <FieldError>{t(errors.password.message)}</FieldError>}
              </Field>
              {serverError && <FieldError>{serverError}</FieldError>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc("loading") : t("loginButton")}
              </Button>
              <p className="text-muted-foreground text-sm">
                {t("noAccount")}{" "}
                <Link href="/register" className="underline underline-offset-4">
                  {t("registerButton")}
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
