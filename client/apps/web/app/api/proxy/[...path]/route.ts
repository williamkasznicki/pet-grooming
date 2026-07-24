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
  const contentType = request.headers.get("content-type") ?? "application/json"
  // Multipart (file uploads) must pass through as raw bytes — text-decoding
  // corrupts the binary parts
  const isBinary = contentType.startsWith("multipart/") || contentType.startsWith("application/octet-stream")
  // AI chat runs an LLM with tool round-trips — well past the default timeout
  const timeout = path[0] === "ai" ? 90_000 : undefined
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : isBinary
        ? Buffer.from(await request.arrayBuffer())
        : await request.text()

  const send = (token?: string) =>
    nestApi.request<unknown>({
      url,
      method: request.method,
      data: body === "" ? undefined : body,
      // Never JSON-transform binary payloads; axios must send the Buffer as-is
      ...(isBinary ? { transformRequest: [(data: unknown) => data] } : {}),
      headers: {
        "Content-Type": contentType,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      maxBodyLength: 10 * 1024 * 1024,
      ...(timeout ? { timeout } : {}),
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

  // 204/304 must not carry a body — NextResponse.json() always writes one,
  // which makes undici throw. Return an empty response for those statuses.
  if (response.status === 204 || response.status === 304) {
    return new NextResponse(null, { status: response.status })
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
