import { NextResponse, type NextRequest } from "next/server"

import { nestApi } from "@/lib/api/nest"
import {
  getAccessToken,
  getRefreshToken,
  refreshSession,
  setSessionCookies,
} from "@/lib/auth/session"

/**
 * Authenticated catch-all: /api/proxy/<anything> → NestJS /<anything>.
 * Attaches the Bearer token from the httpOnly cookie; on 401 it refreshes
 * once (single-flight, rotating) and retries. Browser JS never sees tokens.
 */
async function forward(request: NextRequest, ctx: RouteContext<"/api/proxy/[...path]">) {
  const { path } = await ctx.params
  const url = `/${path.join("/")}${request.nextUrl.search}`
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text()

  const send = (token?: string) =>
    nestApi.request<unknown>({
      url,
      method: request.method,
      data: body === "" ? undefined : body,
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

  let response = await send(await getAccessToken())

  if (response.status === 401) {
    const refreshToken = await getRefreshToken()
    const refreshed = refreshToken ? await refreshSession(refreshToken) : null
    if (refreshed) {
      await setSessionCookies(refreshed)
      response = await send(refreshed.accessToken)
    }
  }

  return NextResponse.json(response.data ?? null, { status: response.status })
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
}
