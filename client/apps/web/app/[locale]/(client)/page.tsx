import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { RiContrastDrop2Line } from "@remixicon/react"

import { Link } from "@/i18n/navigation"
import { nestApi } from "@/lib/api/nest"
import { ServiceIcon } from "@/lib/service-icons"
import { serviceDisplay, type MasterDataItem, type Service } from "@/lib/types/api"
import { formatBand } from "@/lib/utils/weight"

/*
 * Landing per the approved Stitch comp ("Landing Page - Pet Grooming",
 * project 13714251940461288007): cool blue-white canvas, lagoon CTAs, navy
 * ink "Book now" pill, morphing lagoon blob behind the spa illustration,
 * water-fill hover on service cards, connected 3-step journey, lagoon CTA
 * band. All colors come from the shared tokens (globals.css).
 */

async function getData(): Promise<{ services: Service[]; sizes: MasterDataItem[] }> {
  try {
    const [services, sizes] = await Promise.all([
      nestApi.get<Service[]>("/services"),
      nestApi.get<MasterDataItem[]>("/master-data/pet-sizes"),
    ])
    return {
      services: services.status === 200 ? services.data : [],
      sizes: sizes.status === 200 ? sizes.data : [],
    }
  } catch {
    return { services: [], sizes: [] } // backend down → landing still renders
  }
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("landing")
  const { services, sizes } = await getData()
  const sizeOf = (sizeId: number) => sizes.find((size) => size.id === sizeId)

  return (
    <div className="bg-background text-foreground">
      {/* Signature: morphing lagoon blob + water-fill hover (off under reduced motion) */}
      <style>{`
        .lagoon-blob {
          background: linear-gradient(135deg, oklch(0.70 0.115 183 / 0.2) 0%, oklch(0.70 0.115 183 / 0.05) 100%);
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
        }
        @keyframes blob-morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
          67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
        }
        .blob-mask { border-radius: 62% 38% 46% 54% / 55% 46% 54% 45%; }
        @keyframes blob-mask-morph {
          0%, 100% { border-radius: 62% 38% 46% 54% / 55% 46% 54% 45%; }
          34% { border-radius: 44% 56% 62% 38% / 42% 58% 42% 58%; }
          67% { border-radius: 54% 46% 38% 62% / 60% 40% 58% 42%; }
        }
        .water-fill { position: relative; overflow: hidden; }
        .water-fill::before {
          content: ""; position: absolute; inset: auto 0 0 0; height: 0;
          background: oklch(0.70 0.115 183 / 0.1); z-index: 0;
        }
        @media (prefers-reduced-motion: no-preference) {
          .lagoon-blob { animation: blob-morph 8s ease-in-out infinite; }
          .blob-mask { animation: blob-mask-morph 12s ease-in-out infinite; }
          .water-fill::before { transition: height 0.5s ease-out; }
          .water-fill:hover::before { height: 100%; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 overflow-hidden px-4 py-16 lg:flex-row lg:py-28">
        <div className="z-10 flex flex-1 flex-col items-start gap-6">
          <p className="animate-rise bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <RiContrastDrop2Line className="size-4" aria-hidden />
            {t("eyebrow")}
          </p>
          <h1
            className="animate-rise max-w-2xl text-4xl leading-tight text-balance md:text-5xl"
            style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          >
            {t("titleLead")} <span className="text-primary">{t("titleAccent")}</span>
          </h1>
          <p
            className="animate-rise text-muted-foreground max-w-xl"
            style={{ "--rise-delay": "160ms" } as React.CSSProperties}
          >
            {t("subtitle")}
          </p>
          <div
            className="animate-rise flex flex-wrap items-center gap-4 pt-2"
            style={{ "--rise-delay": "240ms" } as React.CSSProperties}
          >
            <Link
              href="/book"
              className="bg-primary text-primary-foreground shadow-primary/20 focus-visible:ring-ring rounded-full px-8 py-3 text-sm font-medium shadow-[0_4px_12px] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("cta")}
            </Link>
            <a
              href="#services"
              className="border-border hover:border-primary hover:text-primary focus-visible:ring-ring rounded-full border px-8 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("ctaSecondary")}
            </a>
          </div>
        </div>

        <div className="relative w-full max-w-xl flex-1">
          {/* Offset gradient blob behind gives the mask depth */}
          <div className="lagoon-blob absolute -inset-4 translate-x-4 translate-y-4 rotate-6" aria-hidden />
          {/* Signature: the illustration itself is clipped by the morphing blob */}
          <div className="blob-mask shadow-primary/15 relative aspect-[5/4] w-full overflow-hidden shadow-[0_12px_40px]">
            <Image src="/hero-spa.png" alt={t("heroAlt")} fill priority className="object-cover" sizes="(min-width: 1024px) 36rem, 100vw" />
          </div>
        </div>
      </section>

      {/* ── Services (bento grid) ───────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="bg-muted/50 px-4 py-24">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-2xl font-semibold">{t("servicesTitle")}</h2>
              <p className="text-muted-foreground mx-auto max-w-2xl">{t("servicesSubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const display = serviceDisplay(service, locale)
                return (
                  <div
                    key={service.id}
                    className="water-fill bg-card border-border/60 hover:border-primary/50 rounded-xl border p-8 shadow-sm transition-colors"
                  >
                    <div className="relative z-10 flex h-full flex-col items-start gap-2">
                      <div className="mb-4">
                        <ServiceIcon service={service} />
                      </div>
                      <h3 className="text-xl font-semibold">{display.name}</h3>
                      {display.description && <p className="text-muted-foreground mb-4">{display.description}</p>}
                      {/* Same master-data badge treatment as the admin tables */}
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        {service.tiers.map((tier) => {
                          const size = sizeOf(tier.sizeId)
                          return (
                            <span
                              key={tier.id}
                              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 font-mono text-xs font-medium"
                              style={
                                size?.hexBgColorCode
                                  ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                                  : undefined
                              }
                            >
                              {formatBand(size)} ฿{Number(tier.priceThb)}
                            </span>
                          )
                        })}
                      </div>
                      <Link href="/book" className="text-primary mt-3 text-sm font-medium hover:underline">
                        {t("book")} →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── The journey (real sequence — connected steps) ────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-2xl font-semibold">{t("stepsTitle")}</h2>
          <p className="text-muted-foreground">{t("stepsSubtitle")}</p>
        </div>
        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
          <div
            className="bg-border/60 absolute top-8 left-0 -z-10 hidden h-px w-full -translate-y-1/2 md:block"
            aria-hidden
          />
          {([1, 2, 3] as const).map((step) => (
            <div key={step} className="bg-background flex flex-col items-center px-4 text-center">
              <div
                className={
                  step === 2
                    ? "bg-primary text-primary-foreground shadow-primary/30 border-background mb-6 flex size-16 items-center justify-center rounded-full border-4 shadow-[0_4px_12px]"
                    : "bg-accent text-primary border-background mb-6 flex size-16 items-center justify-center rounded-full border-4"
                }
              >
                <span className="text-xl font-semibold">{step}</span>
              </div>
              <h4 className="mb-2 text-sm font-bold tracking-wide uppercase">{t(`step${step}Title`)}</h4>
              <p className="text-muted-foreground max-w-64">{t(`step${step}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────── */}
      <section className="bg-primary px-4 py-16">
        <div className="text-primary-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
          <div>
            <h2 className="mb-2 text-3xl text-balance md:text-4xl">{t("finalTitle")}</h2>
            <p className="opacity-80">{t("finalSubtitle")}</p>
          </div>
          <Link
            href="/book"
            className="bg-foreground text-background focus-visible:ring-ring rounded-full px-8 py-4 text-sm font-medium whitespace-nowrap shadow-lg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t("cta")}
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-border/60 bg-muted/50 border-t px-4 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4">
          <p className="text-primary text-lg font-bold">Pet Grooming</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a href="#services" className="text-muted-foreground hover:text-primary transition-colors">
              {t("footerServices")}
            </a>
            <Link href="/book" className="text-muted-foreground hover:text-primary transition-colors">
              {t("footerBook")}
            </Link>
          </div>
          <p className="text-muted-foreground text-sm">{t("footerNote")}</p>
        </div>
      </footer>
    </div>
  )
}
