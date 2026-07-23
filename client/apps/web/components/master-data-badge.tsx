import { Badge } from "@workspace/ui/components/badge"

/**
 * Badge colored by master-data hex codes (MdPetSize / MdBookingStatus rows) —
 * the single place the inline-style pattern lives instead of being repeated
 * on every page. Falls back to the given variant when the row has no colors.
 */
export function MasterDataBadge({
  colors,
  variant = "secondary",
  children,
}: {
  colors: { hexBgColorCode: string | null; hexTextColorCode: string | null } | null | undefined
  variant?: "secondary" | "outline"
  children: React.ReactNode
}) {
  return (
    <Badge
      variant={variant}
      style={
        colors?.hexBgColorCode
          ? { backgroundColor: colors.hexBgColorCode, color: colors.hexTextColorCode ?? undefined }
          : undefined
      }
    >
      {children}
    </Badge>
  )
}
