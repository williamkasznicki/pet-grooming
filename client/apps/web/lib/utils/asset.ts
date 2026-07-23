/**
 * Uploaded files (pet photos) are served by the NestJS API under /uploads —
 * the BFF proxy is JSON-only, so images load straight from the API origin.
 */
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_URL ?? "http://localhost:4000"

export function assetUrl(path: string | null | undefined): string | null {
  return path ? `${ASSET_BASE}${path}` : null
}
