import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { listPublicProperties } from "@/core/booking/catalog";
import { photoUrl } from "@/core/booking/photo";
import { tr } from "@/core/i18n/localized";
import { LOGIN_CODE_LENGTH_COOKIE, LOGIN_EMAIL_COOKIE } from "@/core/guest/constants";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prihlásenie" };

/**
 * 08 Passwordless login of a guest with a code from e-mail (B10, vizuál administrácie v1) — in the client's theme:
 * main photo of the property on the left with what the account offers, the form card on the right.
 */
export default async function GuestLoginPage() {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    const { data: guestId } = await supabase.rpc("current_guest_id", { p_tenant_id: tenant.id });
    if (guestId) redirect("/ucet");
  }
  const [t, properties, jar] = await Promise.all([
    getTranslations("guest.account"),
    listPublicProperties(tenant.id),
    cookies(),
  ]);
  const email = jar.get(LOGIN_EMAIL_COOKIE)?.value ?? null;
  const length = Number(jar.get(LOGIN_CODE_LENGTH_COOKIE)?.value) || 6;
  const photo = properties.find((p) => p.photo)?.photo ?? null;
  const perks = [t("perk1"), t("perk2"), t("perk3")];

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-0 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
      <section className="bg-accent-night relative min-h-36 overflow-hidden text-white sm:rounded-[10px] lg:min-h-[560px]">
        {photo ? (
          <Image
            src={photoUrl(photo.storage_path)}
            alt={tr(photo.alt, tenant.defaultLocale)}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 hidden gap-4 p-8 lg:grid">
          <span className="kicker text-white/80">{t("perksTitle")}</span>
          <ul className="grid gap-2.5 text-base">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex items-center px-5 py-10 sm:px-0 lg:py-0">
        <div className="border-line grid w-full gap-7 sm:rounded-[10px] sm:border sm:p-10">
          <LoginForm
            initialStep={email ? "code" : "email"}
            initialEmail={email}
            initialLength={length}
          />
          <p className="text-muted-foreground text-sm">
            {t("noReservation")}{" "}
            <Link href="/" className="text-ink font-medium underline underline-offset-4">
              {t("seeDates")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
