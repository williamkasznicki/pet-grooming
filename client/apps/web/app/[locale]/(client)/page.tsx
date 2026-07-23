import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { nestApi } from "@/lib/api/nest"
import type { Service } from "@/lib/types/api"
import { formatBand } from "@/lib/utils/weight"

/*
 * Landing identity (reference: teal/white "Lovely Dog" comp, user-approved
 * departure from base-lyra neutrality — LANDING ONLY):
 *   lagoon #1E8A93 · lagoon-deep #14666E · foam #FFF · mist #E9F6F7 · ink #143B3E
 *   display: Mitr (rounded, Thai-native) via --font-display
 *   signature: slow-morphing organic blob + paw-print scatter
 */

type SizeRef = { id: number; code: string; minWeightKg: string | null; maxWeightKg: string | null }

async function getData(): Promise<{ services: Service[]; sizes: SizeRef[] }> {
  try {
    const [services, sizes] = await Promise.all([
      nestApi.get<Service[]>("/services"),
      nestApi.get<SizeRef[]>("/master-data/pet-sizes"),
    ])
    return {
      services: services.status === 200 ? services.data : [],
      sizes: sizes.status === 200 ? sizes.data : [],
    }
  } catch {
    return { services: [], sizes: [] } // backend down → landing still renders
  }
}

/** Playful stand-ins until the shop has photography; keyed loosely by service name. */
function serviceEmoji(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("bath") || lower.includes("brush")) return "🛁"
  if (lower.includes("nail")) return "💅"
  if (lower.includes("groom") || lower.includes("cut")) return "✂️"
  return "🐾"
}

/** Paw print as a data-URI, scattered as a background (the reference's texture). */
const PAW = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><g fill='%231E8A93' fill-opacity='0.08' transform='rotate(-18 24 24)'><ellipse cx='24' cy='30' rx='9' ry='7'/><circle cx='13' cy='19' r='4'/><circle cx='21' cy='14' r='4'/><circle cx='29' cy='14' r='4'/><circle cx='37' cy='19' r='4'/></g></svg>`,
)
const pawScatter = {
  backgroundImage: `url("data:image/svg+xml,${PAW}")`,
  backgroundSize: "150px 150px",
} as const

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("landing")
  const { services, sizes } = await getData()
  const sizeOf = (sizeId: number) => sizes.find((size) => size.id === sizeId)

  return (
    <div className="bg-white text-[#143B3E] dark:bg-[#0D2528] dark:text-[#E9F6F7]">
      {/* Signature blob morph — off under reduced motion */}
      <style>{`
        @keyframes blob-morph {
          0%, 100% { border-radius: 58% 42% 46% 54% / 52% 48% 58% 42%; }
          50% { border-radius: 44% 56% 58% 42% / 46% 54% 44% 56%; }
        }
        .blob { border-radius: 58% 42% 46% 54% / 52% 48% 58% 42%; }
        @media (prefers-reduced-motion: no-preference) {
          .blob-animate { animation: blob-morph 9s ease-in-out infinite; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={pawScatter}>
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-16 sm:grid-cols-2 sm:py-24">
          <div className="flex flex-col items-start gap-5">
            <p className="rounded-full bg-[#1E8A93] px-4 py-1 text-xs font-semibold tracking-widest text-white uppercase">
              {t("eyebrow")}
            </p>
            <h1
              className="text-4xl leading-tight font-semibold text-balance sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("title")}
            </h1>
            <p className="max-w-prose text-lg opacity-80">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="rounded-full bg-[#1E8A93] px-7 py-3 font-semibold text-white shadow-lg shadow-[#1E8A93]/25 transition-transform hover:scale-[1.03] hover:bg-[#14666E] focus-visible:ring-2 focus-visible:ring-[#1E8A93] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t("cta")}
              </Link>
              <a
                href="#services"
                className="rounded-full border-2 border-[#1E8A93] px-7 py-3 font-semibold text-[#1E8A93] transition-colors hover:bg-[#E9F6F7] focus-visible:ring-2 focus-visible:ring-[#1E8A93] focus-visible:ring-offset-2 focus-visible:outline-none dark:text-[#7FD6DD] dark:hover:bg-[#143B3E]"
              >
                {t("ctaSecondary")}
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex items-center justify-center">
            <div className="blob blob-animate flex size-64 items-center justify-center bg-[#1E8A93] sm:size-80">
              <span className="text-8xl drop-shadow-lg sm:text-9xl" role="img" aria-label="dog">
                🐕
              </span>
            </div>
            <span className="absolute -top-2 right-2 text-3xl opacity-60">🐾</span>
            <span className="absolute bottom-4 -left-2 rotate-[-20deg] text-2xl opacity-40">🐾</span>
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="bg-[#E9F6F7] dark:bg-[#0F2E32]">
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <h2
              className="text-center text-3xl font-semibold text-balance"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("servicesTitle")}
            </h2>
            <p className="mt-2 text-center opacity-70">{t("servicesSubtitle")}</p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => {
                const prices = service.tiers.map((tier) => Number(tier.priceThb))
                const from = prices.length > 0 ? Math.min(...prices) : null
                return (
                  <div
                    key={service.id}
                    className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md dark:bg-[#143B3E]"
                  >
                    <div className="blob flex size-24 items-center justify-center bg-[#1E8A93]/10 dark:bg-[#1E8A93]/30">
                      <span className="text-4xl" aria-hidden>
                        {serviceEmoji(service.name)}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {service.name}
                    </h3>
                    {service.description && <p className="text-sm opacity-70">{service.description}</p>}
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {service.tiers.map((tier) => (
                        <span
                          key={tier.id}
                          className="rounded-full bg-[#E9F6F7] px-2.5 py-0.5 text-xs font-medium text-[#14666E] dark:bg-[#0F2E32] dark:text-[#7FD6DD]"
                        >
                          {formatBand(sizeOf(tier.sizeId))} ฿{Number(tier.priceThb)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex w-full items-center justify-between pt-3">
                      {from !== null && (
                        <span className="font-semibold text-[#1E8A93] dark:text-[#7FD6DD]">
                          {t("from", { price: from })}
                        </span>
                      )}
                      <Link
                        href="/book"
                        className="rounded-full bg-[#1E8A93] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14666E] focus-visible:ring-2 focus-visible:ring-[#1E8A93] focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        {t("book")}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works (a real sequence — numbers carry meaning) ───── */}
      <section className="relative" style={pawScatter}>
        <div className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {t("stepsTitle")}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {([1, 2, 3] as const).map((step) => (
              <li key={step} className="flex flex-col items-center gap-3 text-center">
                <span
                  className="blob flex size-14 items-center justify-center bg-[#1E8A93] text-xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {step}
                </span>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {t(`step${step}Title`)}
                </h3>
                <p className="max-w-64 text-sm opacity-70">{t(`step${step}Desc`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Closing CTA band ─────────────────────────────────────────── */}
      <section className="bg-[#1E8A93] text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-3xl font-semibold text-balance" style={{ fontFamily: "var(--font-display)" }}>
              {t("finalTitle")}
            </h2>
            <p className="mt-1 opacity-85">{t("finalSubtitle")}</p>
          </div>
          <Link
            href="/book"
            className="shrink-0 rounded-full bg-white px-8 py-3 font-semibold text-[#14666E] shadow-lg transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E8A93] focus-visible:outline-none"
          >
            {t("cta")} 🐾
          </Link>
        </div>
      </section>
    </div>
  )
}
