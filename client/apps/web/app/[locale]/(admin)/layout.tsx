import { redirect } from "next/navigation"

import { AdminSidebar } from "@/components/admin-sidebar"
import { getSessionUser } from "@/lib/auth/get-session"
import { can, Permissions } from "@/lib/permissions"

/** Any of these grants access to the admin area; the sidebar filters further. */
const ADMIN_AREA_PERMISSIONS = [
  Permissions.SUPER_ADMIN,
  Permissions.UPDATE_BOOKING,
  Permissions.MANAGE_SERVICES,
  Permissions.MANAGE_STAFF,
  Permissions.MANAGE_SETTINGS,
  Permissions.MANAGE_USERS,
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: UX only — every API call is still enforced by NestJS guards.
  const user = await getSessionUser()
  if (!user || !ADMIN_AREA_PERMISSIONS.some((permission) => can(user.permissions, permission))) {
    redirect("/")
  }

  return (
    // Stacks on mobile (nav bar on top), sidebar layout from md up
    <div className="flex min-h-svh flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  )
}
