"use client"

import { RiFootprintFill } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"

import type { Pet } from "@/lib/types/api"
import { assetUrl } from "@/lib/utils/asset"

/**
 * Pet photo in the signature organic blob shape; paw icon fallback when the
 * pet has no photo yet.
 */
export function PetAvatar({ pet, className }: { pet: Pet; className?: string }) {
  const src = assetUrl(pet.photoUrl)
  const blob = { borderRadius: "58% 42% 46% 54% / 52% 48% 58% 42%" } as const

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cross-origin API asset, not an optimizable static import
      <img
        src={src}
        alt={pet.name}
        style={blob}
        className={cn("bg-primary/10 size-14 shrink-0 object-cover", className)}
      />
    )
  }
  return (
    <div
      style={blob}
      className={cn("bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      <RiFootprintFill className="size-6" />
    </div>
  )
}
