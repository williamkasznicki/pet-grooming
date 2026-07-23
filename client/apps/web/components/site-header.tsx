"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { RiCloseLine, RiMenuLine } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

import { Link, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

export function SiteHeader() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const { user, can, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const switchLocale = (next: string) => {
    // HARD navigation on purpose: swapping <html lang> re-renders the root
    // layout, and a soft nav makes React re-encounter next-themes' inline
    // <script> (dev warning; script would not re-run anyway). A full load
    // gives a clean document in the new locale.
    const target = window.location.pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`)
    window.location.assign(target + window.location.search)
  }

  const onLogout = () => {
    setMenuOpen(false)
    void logout().then(() => {
      router.replace("/")
      router.refresh() // re-render server components without the session
    })
  }

  const close = () => setMenuOpen(false)

  /** Shared between the desktop row and the mobile panel. */
  const navItems = (
    <>
      {user && (
        <>
          {/* Base UI composition: render swaps the underlying element */}
          <Button variant="ghost" size="sm" render={<Link href="/pets" onClick={close} />}>
            {t("myPets")}
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/bookings" onClick={close} />}>
            {t("myBookings")}
          </Button>
        </>
      )}
      {user && can(Permissions.MANAGE_SETTINGS) && (
        <Button variant="ghost" size="sm" render={<Link href="/admin" onClick={close} />}>
          {t("admin")}
        </Button>
      )}
    </>
  )

  const authItems = user ? (
    <>
      <span className="text-muted-foreground max-w-32 truncate px-1" title={user.name}>
        {user.name}
      </span>
      <Button variant="outline" size="sm" onClick={onLogout}>
        {t("logout")}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" render={<Link href="/login" onClick={close} />}>
        {t("login")}
      </Button>
      <Button size="sm" render={<Link href="/register" onClick={close} />}>
        {t("register")}
      </Button>
    </>
  )

  const localeButton = (
    <Button variant="ghost" size="sm" onClick={() => switchLocale(locale === "en" ? "th" : "en")}>
      {locale === "en" ? "ไทย" : "EN"}
    </Button>
  )

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 font-semibold" onClick={close}>
          🐾 Pet Grooming
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems}
          {localeButton}
          {authItems}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          {localeButton}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <RiCloseLine /> : <RiMenuLine />}
          </Button>
        </div>
      </div>

      {/* Mobile panel */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t px-4 py-3 text-sm md:hidden [&>button]:justify-start [&>a]:justify-start">
          {navItems}
          <div className="mt-2 flex items-center gap-2 border-t pt-3">{authItems}</div>
        </nav>
      )}
    </header>
  )
}
