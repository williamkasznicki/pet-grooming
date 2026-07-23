"use client"

import { Suspense, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import { emptyLoginValues, loginSchema, type LoginValues } from "@/lib/factories/authFactory"

export default function LoginPage() {
  return (
    // useSearchParams requires a Suspense boundary during prerendering
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

/** Second step of login: enter the emailed 6-digit code. */
type OtpChallenge = { challengeId: string; devCode: string | null }

function LoginForm() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const { login, verifyLoginOtp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/"

  const [serverError, setServerError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: emptyLoginValues })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const outcome = await login(values.email, values.password)
      if (outcome.status === "otp") {
        setChallenge({ challengeId: outcome.challengeId, devCode: outcome.devCode })
      } else {
        router.replace(next)
      }
    } catch (err) {
      setServerError(apiErrorMessage(err, tc("error")))
    }
  })

  if (challenge) {
    return <OtpStep challenge={challenge} onVerified={() => router.replace(next)} verify={verifyLoginOtp} />
  }

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
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                  <Link href="/forgot-password" className="text-primary text-xs hover:underline">
                    {t("forgotLink")}
                  </Link>
                </div>
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

function OtpStep({
  challenge,
  verify,
  onVerified,
}: {
  challenge: OtpChallenge
  verify: (challengeId: string, code: string) => Promise<unknown>
  onVerified: () => void
}) {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await verify(challenge.challengeId, code)
      onVerified()
    } catch (err) {
      setError(apiErrorMessage(err, tc("error")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("otpTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <p className="text-muted-foreground text-sm">{t("otpSubtitle")}</p>
            {/* Dev-only: the echoed code, so local testing needs no real inbox */}
            {challenge.devCode && (
              <p className="bg-muted rounded-md px-3 py-2 font-mono text-sm">dev code: {challenge.devCode}</p>
            )}
            <Field>
              <FieldLabel htmlFor="otp">{t("otpCode")}</FieldLabel>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-[0.5em]"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Button disabled={busy || code.length !== 6} onClick={() => void submit()}>
              {busy ? tc("loading") : t("otpVerify")}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
