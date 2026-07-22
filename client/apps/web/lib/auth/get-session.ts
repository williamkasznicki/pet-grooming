import "server-only"

import { nestApi } from "../api/nest"
import { getAccessToken } from "./session"
import type { SessionUser } from "./session"

/**
 * Server-side session read for layouts/pages (Next streaming pattern: call
 * WITHOUT await and let the client `use()` the promise inside Suspense).
 * Only verifies — token rotation already happened in proxy.ts, the sole
 * page-path place allowed to set cookies.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const res = await nestApi.get<SessionUser>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.status === 200 ? res.data : null
}
