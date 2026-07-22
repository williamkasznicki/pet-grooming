import "server-only"
import { cookies } from "next/headers"

import { nestApi } from "../api/nest"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookie-names"
import { createSingleFlight } from "./single-flight"

export type SessionUser = {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

type AuthPayload = { accessToken: string; refreshToken: string; user: SessionUser }

// Secure in production; ALLOW_INSECURE_COOKIES=1 permits plain-http smoke tests
// of a production build on localhost (never set it on a real deployment).
const secure = process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "1"
const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" }

/** TTLs mirror the backend (docs/AUTH.md): short-lived access, 30d rotating refresh. */
export async function setSessionCookies(payload: AuthPayload): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_COOKIE, payload.accessToken, { ...base, maxAge: 15 * 60 })
  store.set(REFRESH_COOKIE, payload.refreshToken, { ...base, maxAge: 30 * 24 * 60 * 60 })
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value
}

/**
 * Single-flight refresh: concurrent 401s share one rotation (the backend
 * revokes the presented token on use, so a second parallel refresh with the
 * same token would 401). Lazy-evicting cache — no timers, no leak.
 */
const singleFlight = createSingleFlight<AuthPayload | null>(5_000)

export function refreshSession(refreshToken: string): Promise<AuthPayload | null> {
  return singleFlight(refreshToken, async () => {
    const res = await nestApi.post<AuthPayload>("/auth/refresh", { refreshToken })
    return res.status === 200 ? res.data : null
  })
}
