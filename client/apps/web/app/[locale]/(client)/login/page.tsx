"use client"

import { Suspense, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"

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

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      router.replace(searchParams.get("next") ?? "/")
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
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm whitespace-pre-line">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? tc("loading") : t("loginButton")}
            </Button>
            <p className="text-muted-foreground text-sm">
              {t("noAccount")}{" "}
              <Link href="/register" className="underline underline-offset-4">
                {t("registerButton")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
