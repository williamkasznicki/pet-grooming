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

/**
 * BFF auth endpoints (docs/DESIGN.md): tokens never reach browser JS —
 * they are exchanged with NestJS here and stored as httpOnly cookies.
 * The browser receives only { user }.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params

  switch (action) {
    case "login":
    case "register": {
      const body: unknown = await request.json().catch(() => ({}))
      const res = await nestApi.post<AuthPayload>(`/auth/${action}`, body)
      if (res.status !== 200 && res.status !== 201) {
        return NextResponse.json(res.data, { status: res.status })
      }
      await setSessionCookies(res.data)
      return NextResponse.json({ user: res.data.user }, { status: res.status })
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
