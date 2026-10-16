import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LogOut, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutGuest } from "@/core/guest/auth";
import { listStays, requireGuest } from "@/core/guest/zone";
import { todayIso } from "@/core/pricing/dates";
import { Container, Heading } from "@/core/sections/ui";
import { StayCard } from "./stay-ui";
import { ContactForm, MarketingToggle } from "./zone-forms";

export const metadata: Metadata = { title: "Môj účet" };

/** Guest zone (B10): the nearest stay on top, the rest as lists; contact details and consent on the side. */
export default async function GuestZonePage() {
  const { tenant, supabase, guest } = await requireGuest();
  const [stays, t, { data: contact }] = await Promise.all([
    listStays(),
    getTranslations("guest.account"),
    supabase.rpc("tenant_public_contact", { p_tenant_id: tenant.id }).maybeSingle(),
  ]);
  const today = todayIso();
  const active = stays.filter((s) => s.status !== "cancelled" && s.checkOut >= today);
  const next = [...active].sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  const upcoming = active.filter((s) => s.id !== next?.id);
  const past = stays.filter((s) => s.status === "cancelled" || s.checkOut < today);
  const firstName = guest.name?.split(" ")[0] || "none";

  return (
    <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_320px]">
      <div className="grid content-start gap-10">
        <Heading
          as="h1"
          size="md"
          kicker={t("menu")}
          title={t("hello", { name: firstName })}
          subtitle={t("helloSub", { tenant: tenant.name })}
        />
        {stays.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : null}
        {next ? (
          <section className="grid gap-4">
            <h2 className="kicker text-muted-foreground">{t("next")}</h2>
            <StayCard stay={next} big />
          </section>
        ) : null}
        {upcoming.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="kicker text-muted-foreground">{t("upcoming")}</h2>
            {upcoming.map((s) => (
              <StayCard key={s.id} stay={s} />
            ))}
          </section>
        ) : null}
        {past.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="kicker text-muted-foreground">{t("past")}</h2>
            {past.map((s) => (
              <StayCard key={s.id} stay={s} />
            ))}
          </section>
        ) : null}
      </div>

      <aside className="grid content-start gap-8">
        <section className="border-line grid gap-4 rounded-3xl border p-6">
          <h2 className="text-ink font-bold">{t("contactTitle")}</h2>
          <p className="text-muted-foreground text-sm">{guest.email}</p>
          <ContactForm guest={guest} />
        </section>
        <section className="border-line grid gap-3 rounded-3xl border p-6">
          <h2 className="text-ink font-bold">{t("marketingTitle")}</h2>
          <MarketingToggle granted={guest.marketing_consent} />
        </section>
        {contact?.whatsapp_phone || contact?.contact_phone ? (
          <section className="border-line grid gap-3 rounded-3xl border p-6">
            <h2 className="text-ink font-bold">{t("questions")}</h2>
            <div className="flex flex-wrap gap-2">
              {contact.whatsapp_phone ? (
                <a
                  href={`https://wa.me/${contact.whatsapp_phone.replace(/\D/g, "")}`}
                  className="border-line text-ink inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              ) : null}
              {contact.contact_phone ? (
                <a
                  href={`tel:${contact.contact_phone.replace(/\s/g, "")}`}
                  className="border-line text-ink inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm"
                >
                  <Phone className="size-4" /> {contact.contact_phone}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
        <form action={signOutGuest}>
          <Button type="submit" variant="ghost" className="rounded-full">
            <LogOut /> {t("signOut")}
          </Button>
        </form>
      </aside>
    </Container>
  );
}
