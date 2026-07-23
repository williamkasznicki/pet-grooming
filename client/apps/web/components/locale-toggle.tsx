"use client"

import { useLocale } from "next-intl"
import { RiTranslate2 } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale()

  const switchLocale = () => {
    // HARD navigation on purpose: swapping <html lang> re-renders the root
    // layout, and a soft nav makes React re-encounter next-themes' inline
    // <script> (dev warning). A full load gives a clean document.
    const next = locale === "en" ? "th" : "en"
    const target = window.location.pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`)
    window.location.assign(target + window.location.search)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={locale === "en" ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English"}
      title={locale === "en" ? "ไทย" : "EN"}
      onClick={switchLocale}
    >
      <RiTranslate2 />
    </Button>
  )
}
