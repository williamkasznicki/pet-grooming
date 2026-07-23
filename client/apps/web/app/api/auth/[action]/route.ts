import { NextResponse, type NextRequest } from "next/server"

import { nestApi } from "@/lib/api/nest"
import {
  clearSessionCookies,
  getRefreshToken,
  refreshSession,
  setSessionCookies,
  type SessionUser,
} from "@/lib/auth/session"

type AuthPayload = { accessToken: string; refreshToken: string; user: SessionUser }
/** POST /auth/login result: tokens directly, or an OTP challenge when 2FA is on. */
type LoginResult = { requiresOtp: boolean; challengeId: string | null; auth: AuthPayload | null; devCode: string | null }

/**
 * BFF auth endpoints (docs/DESIGN.md): tokens never reach browser JS —
 * they are exchanged with NestJS here and stored as httpOnly cookies.
 * The browser receives only { user } (or an OTP challenge).
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params

  switch (action) {
    case "register": {
      const body: unknown = await request.json().catch(() => ({}))
      const res = await nestApi.post<AuthPayload>("/auth/register", body)
      if (res.status !== 200 && res.status !== 201) {
        return NextResponse.json(res.data, { status: res.status })
      }
      await setSessionCookies(res.data)
      return NextResponse.json({ user: res.data.user }, { status: res.status })
    }

    case "login": {
      const body: unknown = await request.json().catch(() => ({}))
      const res = await nestApi.post<LoginResult>("/auth/login", body)
      if (res.status !== 200) {
        return NextResponse.json(res.data, { status: res.status })
      }
      // 2FA on: hand the challenge to the browser (no tokens yet, no cookies)
      if (res.data.requiresOtp) {
        return NextResponse.json({ requiresOtp: true, challengeId: res.data.challengeId, devCode: res.data.devCode })
      }
      // 2FA off: tokens came back — set cookies, return the user
      if (res.data.auth) {
        await setSessionCookies(res.data.auth)
        return NextResponse.json({ user: res.data.auth.user })
      }
      return NextResponse.json({ message: "Unexpected login response" }, { status: 502 })
    }

    case "login-verify": {
      const body: unknown = await request.json().catch(() => ({}))
      const res = await nestApi.post<AuthPayload>("/auth/login/verify", body)
      if (res.status !== 200) {
        return NextResponse.json(res.data, { status: res.status })
      }
      await setSessionCookies(res.data)
      return NextResponse.json({ user: res.data.user })
    }

    case "forgot-password":
    case "reset-password": {
      // Pure pass-through: no tokens involved, no cookies set
      const body: unknown = await request.json().catch(() => ({}))
      const res = await nestApi.post(`/auth/${action}`, body)
      // 204 (reset success) must not carry a body
      if (res.status === 204) return new NextResponse(null, { status: 204 })
      return NextResponse.json(res.data ?? null, { status: res.status })
    }

    case "refresh": {
      const refreshToken = await getRefreshToken()
      const payload = refreshToken ? await refreshSession(refreshToken) : null
      if (!payload) {
        await clearSessionCookies()
        return NextResponse.json({ message: "Session expired" }, { status: 401 })
      }
      await setSessionCookies(payload)
      return NextResponse.json({ user: payload.user })
    }

    case "logout": {
      const refreshToken = await getRefreshToken()
      if (refreshToken) {
        await nestApi.post("/auth/logout", { refreshToken })
      }
      await clearSessionCookies()
      return new NextResponse(null, { status: 204 })
    }

    default:
      return NextResponse.json({ message: "Unknown auth action" }, { status: 404 })
  }
}
