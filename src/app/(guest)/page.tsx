import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BedDouble, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublicProperties, listTerms } from "@/core/booking/catalog";
import { photoUrl } from "@/core/booking/photo";
import { formatMoney } from "@/core/format/format";
import { tr } from "@/core/i18n/localized";
import { money } from "@/core/money/money";
import { isIsoDate } from "@/core/pricing/dates";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Booking entry: catalogue with filters (showroom, clients without a website), or straight to the only property. */
export default async function GuestHome({ searchParams }: PageProps<"/">) {
  const t = await getTranslations();
  const tenant = await getTenantFromHost();
  if (!tenant) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-sm">{t("booking.notFound")}</p>
        <Button asChild variant="outline">
          <Link href="/login">{t("common.signIn")}</Link>
        </Button>
      </main>
    );
  }

  const sp = await searchParams;
  const locale = await getLocale();
  const [all, terms] = await Promise.all([listPublicProperties(tenant.id), listTerms(tenant.id)]);

  // A client with one property (typically with its own website, A17) goes straight to the property, keeping the widget's dates.
  if (all.length === 1) {
    const qs = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    );
    redirect(`/p/${all[0]!.slug}${qs.size ? `?${qs}` : ""}`);
  }

  const type = one(sp.type);
  const region = one(sp.region);
  const guests = Number(one(sp.guests)) || 0;
  const checkIn = one(sp.check_in);
  const checkOut = one(sp.check_out);

  let freeProperties: Set<string> | null = null;
  if (isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("free_units", {
      p_tenant_id: tenant.id,
      p_check_in: checkIn,
      p_check_out: checkOut,
    });
    freeProperties = new Set((data ?? []).map((r) => r.property_id));
  }
  const termId = (kind: string, key: string) =>
    terms.find((x) => x.kind === kind && x.key === key)?.id;
  const typeId = type ? termId("property_type", type) : undefined;
  const regionId = region ? termId("region", region) : undefined;

  const list = all.filter(
    (p) =>
      (!typeId || p.termIds.includes(typeId)) &&
      (!regionId || p.termIds.includes(regionId)) &&
      (!guests || p.max_guests >= guests) &&
      (!freeProperties || freeProperties.has(p.id)),
  );
  const usedTerms = new Set(all.flatMap((p) => p.termIds));
  const options = (kind: string) => terms.filter((x) => x.kind === kind && usedTerms.has(x.id));
  const selectClass = "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";
  const detailQuery = new URLSearchParams(
    Object.entries({
      check_in: checkIn,
      check_out: checkOut,
      adults: guests ? String(guests) : "",
    }).filter(([, v]) => v),
  ).toString();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {t("guest.catalog.title")}
      </h1>
      <form className="bg-card border-border grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <label className="grid gap-1 text-sm">
          {t("guest.catalog.checkIn")}
          <Input type="date" name="check_in" defaultValue={checkIn} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("guest.catalog.checkOut")}
          <Input type="date" name="check_out" defaultValue={checkOut} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("guest.catalog.guests")}
          <Input type="number" name="guests" min={1} defaultValue={guests || ""} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("guest.catalog.type")}
          <select name="type" defaultValue={type} className={selectClass}>
            <option value="">{t("guest.catalog.any")}</option>
            {options("property_type").map((o) => (
              <option key={o.id} value={o.key}>
                {tr(o.name, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("guest.catalog.region")}
          <select name="region" defaultValue={region} className={selectClass}>
            <option value="">{t("guest.catalog.any")}</option>
            {options("region").map((o) => (
              <option key={o.id} value={o.key}>
                {tr(o.name, locale)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {t("guest.catalog.search")}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("guest.catalog.reset")}</Link>
          </Button>
        </div>
      </form>

      <p className="text-muted-foreground text-sm">
        {t("guest.catalog.results", { count: list.length })}
      </p>
      {list.length === 0 ? (
        <p className="text-muted-foreground">{t("guest.catalog.empty")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.slug}${detailQuery ? `?${detailQuery}` : ""}`}
              className="group bg-card border-border overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg"
            >
              <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public storage images
                  <img
                    src={photoUrl(p.photo.storage_path)}
                    alt={tr(p.photo.alt, locale)}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="from-primary/20 to-brand-secondary/20 flex size-full items-center justify-center bg-gradient-to-br">
                    <BedDouble className="text-primary/50 size-10" />
                  </div>
                )}
              </div>
              <div className="grid gap-1 p-4">
                <p className="font-heading text-lg font-semibold">{p.name}</p>
                <p className="text-muted-foreground text-sm">{p.city}</p>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {tr(p.summary, locale)}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Users className="size-4" />{" "}
                    {t("guest.catalog.guestsUpTo", { count: p.max_guests })}
                  </span>
                  {p.fromCents !== null ? (
                    <span className="font-medium">
                      {t(
                        p.pricing_model === "per_person_night"
                          ? "guest.catalog.fromPerson"
                          : "guest.catalog.from",
                        { price: formatMoney(money(p.fromCents, tenant.currency), locale) },
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
