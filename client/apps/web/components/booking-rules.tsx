"use client"

import { useTranslations } from "next-intl"
import { RiInformationLine } from "@remixicon/react"

import { useAxios } from "@/hooks/useAxios"
import type { BookingRules } from "@/lib/types/api"
import { formatMinutesOfDay } from "@/lib/utils/date"

/**
 * Booking rules callout, rendered from GET /booking-rules — the values are
 * admin-editable ShopSettings, never hardcoded here (AGENTS.md rule).
 * Optional widget: renders nothing while loading or on error.
 */
export function BookingRulesCard({ className }: { className?: string }) {
  const t = useTranslations("book.rules")
  const { data: rules } = useAxios<BookingRules>("/booking-rules")

  if (!rules) return null

  const noticeHours = rules.minNoticeMin / 60
  const notice =
    rules.minNoticeMin % 60 === 0 && noticeHours >= 1
      ? t("noticeHours", { hours: noticeHours })
      : t("noticeMinutes", { minutes: rules.minNoticeMin })

  const items = [
    t("hours", { open: formatMinutesOfDay(rules.openMin), close: formatMinutesOfDay(rules.closeMin) }),
    notice,
    t("cancel", { hours: rules.cancelCutoffHours }),
    t("payment"),
  ]

  return (
    <aside className={className} aria-label={t("title")}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
        <RiInformationLine className="size-4" aria-hidden />
        {t("title")}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden>·</span>
            {item}
          </li>
        ))}
      </ul>
    </aside>
  )
}
