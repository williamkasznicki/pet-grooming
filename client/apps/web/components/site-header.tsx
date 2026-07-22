"use client"

import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

export function SiteHeader() {
  const t = useTranslations("nav")
  const locale = useLocale()
  const { user, loading, can, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const switchLocale = (next: string) => {
    // Re-render the same route under the other locale prefix.
    router.replace(
      // @ts-expect-error params are compatible with the current pathname
      { pathname, params },
      { locale: next },
    )
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

          {!loading && !user && (
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
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {user.name}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void logout()}>{t("logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  )
}
