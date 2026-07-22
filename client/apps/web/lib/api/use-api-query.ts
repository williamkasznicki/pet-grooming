"use client"

import { useEffect, useState } from "react"

import { api } from "./client"

export type ApiQuery<T> = {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  /** Re-runs the request with a fresh loading state. */
  refetch: () => void
}

type Settled<T> = { key: string; data?: T; error?: Error }

/**
 * SWR/TanStack-style contract over our axios client (docs/DESIGN.md: axios
 * only): const { data, error, isLoading, refetch } = useApiQuery<Pet[]>("/pets")
 *
 * - `path === null` skips fetching (conditional queries, e.g. waiting for auth)
 * - key change or refetch() re-runs with a clean loading state; stale
 *   responses are ignored (unmount/key-change guard)
 * - `throwOnError` rethrows during render so the nearest Next.js error.tsx
 *   boundary catches it (app/getting-started/error-handling) — use for data
 *   the page cannot exist without; keep inline handling for optional widgets
 */
export function useApiQuery<T>(path: string | null, options?: { throwOnError?: boolean }): ApiQuery<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const key = path === null ? null : `${path}#${refreshIndex}`

  useEffect(() => {
    if (key === null || path === null) return
    let ignore = false
    api
      .get<T>(path)
      .then((res) => {
        if (!ignore) setSettled({ key, data: res.data })
      })
      .catch((err: unknown) => {
        if (!ignore) setSettled({ key, error: err instanceof Error ? err : new Error(String(err)) })
      })
    return () => {
      ignore = true
    }
  }, [key, path])

  // Results from a previous key are stale — treated as still loading.
  const current = settled && settled.key === key ? settled : null

  if (options?.throwOnError && current?.error) {
    throw current.error
  }

  return {
    data: current?.data,
    error: current?.error,
    isLoading: key !== null && current === null,
    refetch: () => setRefreshIndex((index) => index + 1),
  }
}
