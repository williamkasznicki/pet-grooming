"use client" // Error boundaries must be Client Components

import { useEffect } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"

/** Segment error boundary (Next 16 contract: unstable_retry re-renders the segment). */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const t = useTranslations("common")

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50svh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-3xl">😿</p>
      <h2 className="text-xl font-semibold text-balance">{t("errorTitle")}</h2>
      <p className="text-muted-foreground text-sm">{t("error")}</p>
      <Button onClick={() => unstable_retry()}>{t("tryAgain")}</Button>
    </div>
  )
}
