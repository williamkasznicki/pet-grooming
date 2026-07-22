/**
 * Timer-free single-flight cache: concurrent calls with the same key share one
 * promise; entries linger for ttlMs so near-simultaneous stragglers (requests
 * that left the browser with the OLD cookie) still reuse the settled result.
 *
 * Eviction is LAZY — pruned on every call instead of setTimeout — so nothing
 * outlives the request on serverless/edge runtimes and the map stays bounded
 * without keeping timer handles + closures alive (no leak).
 *
 * Dependency-free on purpose: imported by both the Node BFF (session.ts) and
 * the edge proxy (proxy.ts).
 */
export function createSingleFlight<T>(ttlMs: number) {
  const entries = new Map<string, { promise: Promise<T>; at: number }>()

  return function run(key: string, factory: () => Promise<T>): Promise<T> {
    const nowMs = Date.now()
    for (const [entryKey, entry] of entries) {
      if (nowMs - entry.at > ttlMs) entries.delete(entryKey)
    }

    const existing = entries.get(key)
    if (existing) return existing.promise

    const promise = factory()
    entries.set(key, { promise, at: nowMs })
    return promise
  }
}
