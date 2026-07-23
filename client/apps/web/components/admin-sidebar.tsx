"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { RiCloseLine, RiMenuLine } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Link, usePathname } from "@/i18n/navigation"
import { usePermissions } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

const NAV_ITEMS = [
  { href: "/admin", key: "dashboard", permission: null },
  { href: "/admin/bookings", key: "bookings", permission: Permissions.UPDATE_BOOKING },
  { href: "/admin/services", key: "services", permission: Permissions.MANAGE_SERVICES },
  { href: "/admin/sizes", key: "sizes", permission: Permissions.MANAGE_SERVICES },
  { href: "/admin/staff", key: "staff", permission: Permissions.MANAGE_STAFF },
  { href: "/admin/settings", key: "settings", permission: Permissions.MANAGE_SETTINGS },
  { href: "/admin/users", key: "users", permission: Permissions.MANAGE_USERS },
] as const

export function AdminSidebar() {
  const t = useTranslations("admin.nav")
  const { can } = usePermissions()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const items = NAV_ITEMS.filter((item) => item.permission === null || can(item.permission))

  const links = (onNavigate?: () => void) => (
    <>
      {items.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          size="sm"
          className={cn("justify-start", pathname === item.href && "bg-muted font-semibold")}
          render={<Link href={item.href} onClick={onNavigate} />}
        >
          {t(item.key)}
        </Button>
      ))}
    </>
  )

  return (
    <>
      {/* Mobile: collapsed top bar with hamburger */}
      <div className="bg-muted/30 border-b md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">🐾 Admin</p>
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
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t px-2 py-2">
            {links(() => setMenuOpen(false))}
            <Button variant="ghost" size="sm" className="justify-start" render={<Link href="/" />}>
              {t("backToSite")}
            </Button>
          </nav>
        )}
      </div>

      {/* Desktop: fixed sidebar */}
      <aside className="bg-muted/30 hidden w-52 shrink-0 flex-col gap-1 border-r p-4 md:flex">
        <p className="text-muted-foreground mb-3 px-2 text-xs font-semibold tracking-widest uppercase">🐾 Admin</p>
        {links()}
        <div className="mt-auto pt-4">
          <Button variant="ghost" size="sm" className="justify-start" render={<Link href="/" />}>
            {t("backToSite")}
          </Button>
        </div>
      </aside>
    </>
  )
}
