"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Link, useRouter } from "@/i18n/navigation"
import { apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"

export default function RegisterPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const { register } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      router.replace("/")
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
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" required maxLength={120} value={form.name} onChange={set("name")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} />
            </div>
            {error && <p className="text-destructive text-sm whitespace-pre-line">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? tc("loading") : t("registerButton")}
            </Button>
            <p className="text-muted-foreground text-sm">
              {t("haveAccount")}{" "}
              <Link href="/login" className="underline underline-offset-4">
                {t("loginButton")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
