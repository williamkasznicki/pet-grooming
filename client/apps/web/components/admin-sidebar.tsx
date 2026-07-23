"use client"

import { useTranslations } from "next-intl"

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

  return (
    // Mobile: horizontal scrolling top bar · md+: fixed sidebar column
    <aside className="bg-muted/30 flex w-full shrink-0 flex-row items-center gap-1 overflow-x-auto border-b p-2 md:w-52 md:flex-col md:items-stretch md:overflow-visible md:border-r md:border-b-0 md:p-4">
      <p className="text-muted-foreground hidden px-2 text-xs font-semibold tracking-widest uppercase md:mb-3 md:block">
        🐾 Admin
      </p>
      {NAV_ITEMS.filter((item) => item.permission === null || can(item.permission)).map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          size="sm"
          className={cn("shrink-0 md:justify-start", pathname === item.href && "bg-muted font-semibold")}
          render={<Link href={item.href} />}
        >
          {t(item.key)}
        </Button>
      ))}
      <div className="shrink-0 md:mt-auto md:pt-4">
        <Button variant="ghost" size="sm" className="md:justify-start" render={<Link href="/" />}>
          {t("backToSite")}
        </Button>
      </div>
    </aside>
  )
}
