"use client"

import { useLocale, useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"

import { Link, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

export function SiteHeader() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const { user, can, logout } = useAuth()
  const router = useRouter()

  const switchLocale = (next: string) => {
    // HARD navigation on purpose: swapping <html lang> re-renders the root
    // layout, and a soft nav makes React re-encounter next-themes' inline
    // <script> (dev warning; script would not re-run anyway). A full load
    // gives a clean document in the new locale.
    const target = window.location.pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`)
    window.location.assign(target + window.location.search)
  }

  const onLogout = () => {
    void logout().then(() => {
      router.replace("/")
      router.refresh() // re-render server components without the session
    })
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold">
          🐾 Pet Grooming
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user && (
            <>
              {/* Base UI composition: render swaps the underlying element */}
              <Button variant="ghost" size="sm" render={<Link href="/pets" />}>
                {t("myPets")}
              </Button>
              <Button variant="ghost" size="sm" render={<Link href="/bookings" />}>
                {t("myBookings")}
              </Button>
            </>
          )}
          {user && can(Permissions.MANAGE_SETTINGS) && (
            <Button variant="ghost" size="sm" render={<Link href="/admin" />}>
              {t("admin")}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => switchLocale(locale === "en" ? "th" : "en")}>
            {locale === "en" ? "ไทย" : "EN"}
          </Button>

          {!user && (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                {t("login")}
              </Button>
              <Button size="sm" render={<Link href="/register" />}>
                {t("register")}
              </Button>
            </>
          )}

          {user && (
            <>
              <span className="text-muted-foreground max-w-32 truncate px-1" title={user.name}>
                {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                {t("logout")}
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
