"use client"

import { Suspense, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage, authApi } from "@/lib/api/client"

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}

/** Step 2 of reset: enter the emailed code + a new password. */
function ResetForm() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const devCode = searchParams.get("devCode")

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await authApi.post("/reset-password", { email, code, password })
      setDone(true)
      setTimeout(() => router.replace("/login"), 1500)
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
          <CardTitle className="text-2xl">{t("resetTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col gap-3">
              <p className="text-primary text-sm">{t("resetDone")}</p>
              <Button render={<Link href="/login" />}>{t("backToLogin")}</Button>
            </div>
          ) : (
            <FieldGroup>
              <p className="text-muted-foreground text-sm">{t("resetSubtitle")}</p>
              {devCode && <p className="bg-muted rounded-md px-3 py-2 font-mono text-sm">dev code: {devCode}</p>}
              <Field>
                <FieldLabel htmlFor="reset-email">{t("email")}</FieldLabel>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reset-code">{t("resetCode")}</FieldLabel>
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reset-password">{t("newPassword")}</FieldLabel>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button disabled={busy || !email || code.length !== 6 || password.length < 8} onClick={() => void submit()}>
                {busy ? tc("loading") : t("resetButton")}
              </Button>
              <p className="text-muted-foreground text-sm">
                <Link href="/login" className="underline underline-offset-4">
                  {t("backToLogin")}
                </Link>
              </p>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
