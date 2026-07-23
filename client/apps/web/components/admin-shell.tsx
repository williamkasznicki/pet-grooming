"use client"

import { useTranslations } from "next-intl"
import {
  RiCalendarCheckLine,
  RiDashboardLine,
  RiHomeSmile2Line,
  RiLogoutBoxRLine,
  RiScales2Line,
  RiScissors2Line,
  RiSettings3Line,
  RiTeamLine,
  RiUserSettingsLine,
} from "@remixicon/react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

import { LocaleToggle } from "@/components/locale-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Permissions } from "@/lib/permissions"

/**
 * Admin shell per the Stitch admin comp + shadcnblocks application-shell1:
 * dark navy sidebar (sidebar-* tokens) with lagoon active pill, inset content
 * with a breadcrumb topbar. Nav is permission-filtered; the server layout
 * already gates the whole area.
 */

const NAV_ITEMS: Array<{
  href: "/admin" | "/admin/bookings" | "/admin/services" | "/admin/sizes" | "/admin/staff" | "/admin/settings" | "/admin/users"
  key: "dashboard" | "bookings" | "services" | "sizes" | "staff" | "settings" | "users"
  icon: typeof RiDashboardLine
  permission: Permissions | null
}> = [
    { href: "/admin", key: "dashboard", icon: RiDashboardLine, permission: null },
    { href: "/admin/bookings", key: "bookings", icon: RiCalendarCheckLine, permission: Permissions.UPDATE_BOOKING },
    { href: "/admin/services", key: "services", icon: RiScissors2Line, permission: Permissions.MANAGE_SERVICES },
    { href: "/admin/sizes", key: "sizes", icon: RiScales2Line, permission: Permissions.MANAGE_SERVICES },
    { href: "/admin/staff", key: "staff", icon: RiTeamLine, permission: Permissions.MANAGE_STAFF },
    { href: "/admin/settings", key: "settings", icon: RiSettings3Line, permission: Permissions.MANAGE_SETTINGS },
    { href: "/admin/users", key: "users", icon: RiUserSettingsLine, permission: Permissions.MANAGE_USERS },
  ]

function initials ( name: string ): string {
  return (
    name
      .split( " " )
      .map( ( part ) => part[ 0 ] )
      .join( "" )
      .slice( 0, 2 )
      .toUpperCase() || "?"
  )
}

export function AdminShell ( { children }: { children: React.ReactNode } ) {
  const t = useTranslations( "admin.nav" )
  const { user, can, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const items = NAV_ITEMS.filter( ( item ) => item.permission === null || can( item.permission ) )
  // Most specific match wins (e.g. /admin/users over /admin)
  const active = [ ...items ]
    .reverse()
    .find( ( item ) => pathname === item.href || pathname.startsWith( `${ item.href }/` ) )

  const onLogout = () =>
    void logout().then( () => {
      router.replace( "/" )
      router.refresh()
    } )

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={ <Link href="/" /> }>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  🐾
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Pet Grooming</span>
                  <span className="text-sidebar-foreground/60 text-xs">{ t( "panel" ) }</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{ t( "groupManage" ) }</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                { items.map( ( item ) => (
                  <SidebarMenuItem key={ item.href }>
                    <SidebarMenuButton
                      isActive={ item.href === active?.href }
                      tooltip={ t( item.key ) }
                      render={ <Link href={ item.href } /> }
                    >
                      <item.icon className="size-4" />
                      <span>{ t( item.key ) }</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) ) }
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={ t( "backToSite" ) } render={ <Link href="/" /> }>
                <RiHomeSmile2Line className="size-4" />
                <span>{ t( "backToSite" ) }</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            { user && (
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      />
                    }
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground rounded-lg text-xs">
                        { initials( user.name ) }
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{ user.name }</span>
                      <span className="text-sidebar-foreground/60 truncate text-xs">{ user.email }</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="min-w-56 rounded-lg">
                    <DropdownMenuLabel className="truncate">{ user.email }</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={ onLogout }>
                      <RiLogoutBoxRLine className="mr-2 size-4" />
                      { t( "logout" ) }
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) }
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="bg-background/85 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 hidden md:block" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{ active ? t( active.key ) : t( "dashboard" ) }</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">{ children }</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
