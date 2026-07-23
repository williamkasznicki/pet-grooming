import { Suspense } from "react"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { Anuphan, Geist_Mono, Mitr } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth/auth-context"
import { getSessionUser } from "@/lib/auth/get-session"
import { routing } from "@/i18n/routing"
import { cn } from "@workspace/ui/lib/utils"

// Body face: Anuphan — Thai loopless grotesk, native glyphs for both locales
const anuphan = Anuphan({ subsets: ["latin", "thai"], variable: "--font-sans" })

// Display face for all headings: Mitr (rounded, Thai-native)
const mitr = Mitr({ subsets: ["latin", "thai"], weight: ["500", "600"], variable: "--font-display" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  // Streaming pattern (Next docs "fetching-data"): start the session read but
  // do NOT await it — the client AuthProvider reads it with use() so the shell
  // streams while /auth/me resolves. proxy.ts already rotated stale tokens.
  const sessionPromise = getSessionUser()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", anuphan.variable, mitr.variable)}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <Suspense>
              <AuthProvider sessionPromise={sessionPromise}>{children}</AuthProvider>
            </Suspense>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
