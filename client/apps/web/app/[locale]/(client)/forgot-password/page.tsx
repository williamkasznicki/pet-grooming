"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage, authApi } from "@/lib/api/client"

/**
 * Step 1 of reset: request a code. Always reports "sent" (the server never
 * reveals whether the email exists), then forwards to the reset page.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await authApi.post<{ ok: boolean; devCode: string | null }>("/forgot-password", { email })
      const params = new URLSearchParams({ email })
      if (res.data.devCode) params.set("devCode", res.data.devCode)
      router.push(`/reset-password?${params.toString()}`)
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
          <CardTitle className="text-2xl">{t("forgotTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <p className="text-muted-foreground text-sm">{t("forgotSubtitle")}</p>
            <Field>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Button disabled={busy || !email} onClick={() => void submit()}>
              {busy ? tc("loading") : t("forgotButton")}
            </Button>
            <p className="text-muted-foreground text-sm">
              <Link href="/login" className="underline underline-offset-4">
                {t("backToLogin")}
              </Link>
            </p>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}
