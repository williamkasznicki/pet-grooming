"use client"

import { useEffect, useState } from "react"
import type { AxiosRequestConfig } from "axios"

import { api } from "@/lib/api/client"

export type UseAxiosResult<T> = {
  data: T | undefined
  error: Error | undefined
  isError: boolean
  isLoading: boolean
  /** Re-runs the request with a fresh loading state. */
  refetch: () => void
}

type Settled<T> = { key: string; data?: T; error?: Error }

/**
 * SWR/TanStack-style contract over the axios client (docs/DESIGN.md: axios only):
 *
 *   const { data, isLoading, isError } = useAxios<Pet[]>("/pets")
 *   const { data } = useAxios<Availability>(`/availability?${params}`)
 *
 * - `path === null` skips fetching (conditional, e.g. wait for auth)
 * - `config` passes through to axios (method defaults to GET); it is part of
 *   the request key, so changing it re-fetches
 * - stale responses are ignored (unmount/key-change guard); refetch() re-runs
 * - `throwOnError` rethrows during render so the nearest error.tsx boundary
 *   catches it (Next docs: app/getting-started/error-handling) — use for data
 *   the page cannot exist without; keep inline handling for optional widgets
 * - one-shot user actions (submit/delete) are NOT queries: call api.post/put/
 *   delete directly in the event handler
 */
export function useAxios<T>(
  path: string | null,
  options?: { config?: AxiosRequestConfig; throwOnError?: boolean },
): UseAxiosResult<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const configKey = options?.config ? JSON.stringify(options.config) : ""
  const key = path === null ? null : `${path}#${configKey}#${refreshIndex}`

  useEffect(() => {
    if (key === null || path === null) return
    let ignore = false
    api
      .request<T>({ url: path, method: "GET", ...(options?.config ?? {}) })
      .then((res) => {
        if (!ignore) setSettled({ key, data: res.data })
      })
      .catch((err: unknown) => {
        if (!ignore) setSettled({ key, error: err instanceof Error ? err : new Error(String(err)) })
      })
    return () => {
      ignore = true
    }
    // configKey covers options.config; the object identity itself is unstable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path])

  // Results from a previous key are stale — treated as still loading.
  const current = settled && settled.key === key ? settled : null

  if (options?.throwOnError && current?.error) {
    throw current.error
  }

  return {
    data: current?.data,
    error: current?.error,
    isError: current?.error !== undefined,
    isLoading: key !== null && current === null,
    refetch: () => setRefreshIndex((index) => index + 1),
  }
}
