import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { routing } from "./i18n/routing"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./lib/auth/cookie-names"
import { createSingleFlight } from "./lib/auth/single-flight"

const handleI18n = createIntlMiddleware(routing)

/**
 * FAIL-CLOSED page gate: everything needs a session cookie except this list —
 * a new page is protected by default. This is optimistic UX only (skip the
 * broken-shell flash); the enforcement is NestJS guards returning 401/403 on
 * every API call, which the axios client also reacts to (lib/api/client.ts).
 */
const PUBLIC_PATHS = ["/", "/login", "/register", "/book", "/forgot-password", "/reset-password"]

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/"
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}

type RotatedTokens = { accessToken: string; refreshToken: string }

/** Single-flight per refresh token: rotation revokes the presented token, so
 *  parallel page requests must share one exchange. Lazy-evicting — no timers. */
const singleFlight = createSingleFlight<RotatedTokens | null>(5_000)

/** Runs on the edge runtime, where axios cannot — auth infra here uses native
 *  fetch; the axios-only rule (docs/DESIGN.md) governs application data code. */
function rotateTokens(refreshToken: string): Promise<RotatedTokens | null> {
  return singleFlight(refreshToken, async () => {
    try {
      const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      return (await res.json()) as RotatedTokens
    } catch {
      return null
    }
  })
}

const secureCookies = process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "1"
const cookieBase = { httpOnly: true, secure: secureCookies, sameSite: "lax" as const, path: "/" }

// Next 16: middleware is called Proxy (proxy.ts)
export async function proxy(request: NextRequest) {
  const path = stripLocale(request.nextUrl.pathname)
  const hasAccess = request.cookies.has(ACCESS_COOKIE)
  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value

  const isPublic = PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`))
  if (!isPublic && !hasAccess && !refreshCookie) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", path)
    return NextResponse.redirect(loginUrl)
  }

  // Access token expired but a refresh token exists: rotate HERE (the layout
  // renders with a valid session and may not set cookies itself). Streaming
  // pattern: the layout then only verifies, never refreshes.
  let rotated: RotatedTokens | null = null
  if (!hasAccess && refreshCookie) {
    rotated = await rotateTokens(refreshCookie)
    if (!rotated) {
      // Dead session: clear cookies; redirect protected pages to login.
      const response = isPublic
        ? handleI18n(request)
        : NextResponse.redirect(
            Object.assign(request.nextUrl.clone(), { pathname: "/login" }),
          )
      response.cookies.delete(ACCESS_COOKIE)
      response.cookies.delete(REFRESH_COOKIE)
      return response
    }
    // Make the fresh token visible to this very render pass.
    request.cookies.set(ACCESS_COOKIE, rotated.accessToken)
  }

  const response = handleI18n(request)
  if (rotated) {
    response.cookies.set(ACCESS_COOKIE, rotated.accessToken, { ...cookieBase, maxAge: 15 * 60 })
    response.cookies.set(REFRESH_COOKIE, rotated.refreshToken, { ...cookieBase, maxAge: 30 * 24 * 60 * 60 })
  }
  return response
}

export const config = {
  // Everything except API routes, Next internals, and files with extensions
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
