import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { routing } from "./i18n/routing"
import { REFRESH_COOKIE } from "./lib/auth/cookie-names"

const handleI18n = createIntlMiddleware(routing)

/**
 * FAIL-CLOSED page gate: everything needs a session cookie except this list —
 * a new page is protected by default. This is optimistic UX only (skip the
 * broken-shell flash); the enforcement is NestJS guards returning 401/403 on
 * every API call, which the axios client also reacts to (lib/api/client.ts).
 */
const PUBLIC_PATHS = ["/", "/login", "/register", "/book"]

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/"
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}

// Next 16: middleware is called Proxy (proxy.ts)
export function proxy(request: NextRequest) {
  const path = stripLocale(request.nextUrl.pathname)

  const isPublic = PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`))
  if (!isPublic && !request.cookies.has(REFRESH_COOKIE)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", path)
    return NextResponse.redirect(loginUrl)
  }

  return handleI18n(request)
}

export const config = {
  // Everything except API routes, Next internals, and files with extensions
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
