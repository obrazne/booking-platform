import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireGuest } from "@/core/guest/zone";
import { Container } from "@/core/sections/ui";
import { ContactForm, MarketingToggle } from "../zone-forms";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = { title: "Moje údaje" };

/**
 * Moje údaje (v2.4 `UcetPrehlad`, Z43): contact details, how the guest signs in, news by e-mail, and "Moje dáta" —
 * download of the guest's own data and a request to close the account.
 */
export default async function GuestProfilePage() {
  const { tenant, supabase, guest } = await requireGuest();
  const [t, tp, { data: g }] = await Promise.all([
    getTranslations("guest.account"),
    getTranslations("guest.account.profile"),
    supabase.from("guests").select("deletion_requested_at").eq("id", guest.id).single(),
  ]);
  const section = "border-line grid gap-2.5 border-t pt-[22px]";
  return (
    <Container className="pt-10 pb-24">
      <div className="grid max-w-[620px] gap-8">
        <h1 className="font-heading text-ink text-[30px] leading-[1.1] font-extrabold tracking-tight sm:text-[34px]">
          {tp("title")} <span className="text-[#8b929b]">{tp("title2")}</span>
        </h1>
        <ContactForm guest={guest} />
        <section className={section}>
          <h2 className="text-ink text-base font-bold">{tp("login")}</h2>
          <p className="text-sm text-[#5a6672]">{tp("loginText", { email: guest.email })}</p>
        </section>
        <section className={section}>
          <h2 className="text-ink text-base font-bold">{t("marketingTitle")}</h2>
          <MarketingToggle granted={guest.marketing_consent} />
        </section>
        <section className={section}>
          <h2 className="text-ink text-base font-bold">{tp("dataTitle")}</h2>
          <p className="text-sm leading-relaxed text-[#5a6672]">{tp("dataText")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a
              href="/ucet/udaje/export"
              download
              className="text-ink min-h-11 content-center text-sm font-medium underline"
            >
              {tp("download")}
            </a>
            <DeleteAccount
              tenantName={tenant.name}
              requestedAt={g?.deletion_requested_at ?? null}
            />
          </div>
        </section>
      </div>
    </Container>
  );
}
