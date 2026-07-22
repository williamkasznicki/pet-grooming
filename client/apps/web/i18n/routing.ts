import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "th"],
  defaultLocale: "en",
})

export type AppLocale = (typeof routing.locales)[number]
