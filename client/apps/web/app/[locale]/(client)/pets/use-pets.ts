"use client"

import { useMemo } from "react"

import { useApiQuery } from "@/lib/api/use-api-query"
import type { MasterDataItem, Pet } from "@/lib/types/api"

/** Pets + sizes as SWR-style queries; page-critical, so errors hit error.tsx. */
export function usePets() {
  const petsQuery = useApiQuery<Pet[]>("/pets", { throwOnError: true })
  const sizesQuery = useApiQuery<MasterDataItem[]>("/master-data/pet-sizes", { throwOnError: true })

  const sizesById = useMemo(
    () => new Map((sizesQuery.data ?? []).map((size) => [size.id, size])),
    [sizesQuery.data],
  )

  return {
    pets: petsQuery.data ?? null,
    sizes: sizesQuery.data ?? [],
    sizesById,
    isLoading: petsQuery.isLoading || sizesQuery.isLoading,
    reload: petsQuery.refetch,
  }
}
