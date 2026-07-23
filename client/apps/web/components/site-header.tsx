"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { RiCloseLine, RiMenuLine } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

import { LocaleToggle } from "@/components/locale-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Link, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

export function SiteHeader() {
  const t = useTranslations("nav")
  const { user, can, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    // relative: the mobile panel is an absolute OVERLAY, never pushing content
    <header className="bg-background relative z-40 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 font-semibold" onClick={close}>
          🐾 Pet Grooming
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems}
          <LocaleToggle />
          <ThemeToggle />
          {authItems}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <LocaleToggle />
          <ThemeToggle />
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

      {/* Mobile panel — overlays the page content */}
      {menuOpen && (
        <nav className="bg-background absolute inset-x-0 top-full z-50 flex flex-col gap-1 border-b px-4 py-3 text-sm shadow-lg md:hidden [&>button]:justify-start [&>a]:justify-start">
          {navItems}
          <div className="mt-2 flex items-center gap-2 border-t pt-3">{authItems}</div>
        </nav>
      )}
    </header>
  )
}
