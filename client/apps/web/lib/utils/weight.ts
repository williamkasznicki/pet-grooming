import type { MasterDataItem } from "@/lib/types/api"

/** Human label for a weight band: "0–10 kg", "40+ kg"; falls back to the code. */
export function formatBand(size: Pick<MasterDataItem, "code" | "minWeightKg" | "maxWeightKg"> | undefined): string {
  if (!size) return ""
  if (size.minWeightKg === null) return size.code
  const min = Number(size.minWeightKg)
  return size.maxWeightKg === null ? `${min}+ kg` : `${min}–${Number(size.maxWeightKg)} kg`
}
