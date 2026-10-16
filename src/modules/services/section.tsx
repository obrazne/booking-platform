import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { defineSection, headingFields } from "@/core/sections/types";
import { Container, Heading, pick } from "@/core/sections/ui";

/** "Services on request" section of the property page (B7) — ordered in the cart, shown here only when a template uses it. */
export const servicesSection = defineSection({
  type: "services",
  schema: z.object({ ...headingFields }),
  render: async ({ content, data }) => {
    if (data.services.length === 0) return null;
    const t = await getTranslations("modules.services.section");
    const tm = await getTranslations("priceModels");
    return (
      <Container className="grid gap-8 py-24">
        <Heading
          kicker={pick(content.kicker, data.locale, t("kicker"))}
          title={pick(content.title, data.locale, t("title"))}
          subtitle={pick(content.subtitle, data.locale, t("subtitle"))}
        />
        <div className="border-line divide-line grid divide-y border-y">
          {data.services.map((s) => (
            <div key={s.id} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
              <div className="grid gap-1">
                <span className="text-ink text-lg font-bold tracking-tight">{s.name}</span>
                {s.description ? (
                  <span className="text-muted-foreground text-sm">{s.description}</span>
                ) : null}
              </div>
              <span className="text-ink font-medium tabular-nums sm:text-right">
                {data.money(s.amountCents)}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  {tm(s.priceModel as "per_stay")}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Container>
    );
  },
});
