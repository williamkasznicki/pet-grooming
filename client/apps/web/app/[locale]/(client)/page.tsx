import { getTranslations, setRequestLocale } from "next-intl/server"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { Link } from "@/i18n/navigation"
import { nestApi } from "@/lib/api/nest"

type Service = {
  id: string
  name: string
  description: string | null
  tiers: { sizeId: number; priceThb: string; durationMin: number }[]
}

async function getServices(): Promise<Service[]> {
  try {
    const res = await nestApi.get<Service[]>("/services")
    return res.status === 200 ? res.data : []
  } catch {
    return [] // backend down → landing still renders
  }
}

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("landing")
  const services = await getServices()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <section className="flex flex-col items-start gap-4 py-8">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{t("title")}</h1>
        <p className="text-muted-foreground max-w-prose text-lg">{t("subtitle")}</p>
        <Button size="lg" render={<Link href="/book" />}>
          {t("cta")}
        </Button>
      </section>

      {services.length > 0 && (
        <section className="py-8">
          <h2 className="mb-4 text-2xl font-semibold">{t("servicesTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const prices = service.tiers.map((tier) => Number(tier.priceThb))
              const from = prices.length > 0 ? Math.min(...prices) : null
              return (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle>{service.name}</CardTitle>
                    {service.description && <CardDescription>{service.description}</CardDescription>}
                  </CardHeader>
                  {from !== null && (
                    <CardContent className="text-muted-foreground text-sm">฿{from}+</CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
