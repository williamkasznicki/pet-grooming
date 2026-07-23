import {
  RiBrushFill,
  RiContrastDrop2Line,
  RiDropFill,
  RiFootprintFill,
  RiHeart3Fill,
  RiScissors2Fill,
  RiShowersFill,
  RiSparkling2Fill,
  RiStarSmileFill,
} from "@remixicon/react"

import type { Service } from "@/lib/types/api"

/**
 * Preset icon keys an admin can assign to a service — mirror of
 * server/src/modules/services/service-icons.constant.ts (the API rejects
 * anything outside that list).
 */
export const SERVICE_ICONS = {
  scissors: RiScissors2Fill,
  shower: RiShowersFill,
  drop: RiDropFill,
  paw: RiFootprintFill,
  sparkle: RiSparkling2Fill,
  heart: RiHeart3Fill,
  star: RiStarSmileFill,
  brush: RiBrushFill,
} as const

export type ServiceIconKey = keyof typeof SERVICE_ICONS

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS) as ServiceIconKey[]

/** Admin-picked icon first; legacy rows without one fall back to a name heuristic. */
export function ServiceIcon({ service, className = "text-primary size-9" }: { service: Service; className?: string }) {
  const Preset = service.icon && service.icon in SERVICE_ICONS ? SERVICE_ICONS[service.icon as ServiceIconKey] : null
  if (Preset) return <Preset className={className} aria-hidden />

  const lower = service.name.toLowerCase()
  if (lower.includes("bath") || lower.includes("brush")) return <RiShowersFill className={className} aria-hidden />
  if (lower.includes("groom") || lower.includes("cut") || lower.includes("nail"))
    return <RiScissors2Fill className={className} aria-hidden />
  return <RiContrastDrop2Line className={className} aria-hidden />
}
