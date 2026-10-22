import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireTenant } from "@/core/admin/action";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { addDays, todayIso } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "@/app/admin/ical/client";
import { saveWidgetSites } from "./widget-actions";

/**
 * Kalendár s cenami na webe klienta (Z83, A17 level 2) in Nastavenia → Prepojenia: the websites where it may be
 * (frame-ancestors), the code to paste for each published property and the views / clicks of the last 30 days.
 */
export async function WidgetBody() {
  const active = await requireTenant();
  const [t, tf] = await Promise.all([getTranslations("settings.widget"), getTranslations("forms")]);
  const supabase = await createClient();
  const [{ data: s }, { data: properties }, { data: domains }, { data: stats }] = await Promise.all(
    [
      supabase
        .from("tenant_settings")
        .select("widget_sites")
        .eq("tenant_id", active.tenantId)
        .maybeSingle(),
      supabase
        .from("properties")
        .select("slug, name")
        .eq("tenant_id", active.tenantId)
        .eq("status", "published")
        .order("sort"),
      supabase
        .from("tenant_domains")
        .select("hostname, is_primary")
        .eq("tenant_id", active.tenantId),
      supabase
        .from("widget_stats")
        .select("views, continues")
        .eq("tenant_id", active.tenantId)
        .gte("day", addDays(todayIso(), -30)),
    ],
  );
  const host =
    (domains ?? []).find((d) => d.is_primary && !d.hostname.endsWith(".localhost"))?.hostname ??
    (domains ?? []).find((d) => !d.hostname.endsWith(".localhost"))?.hostname;
  const base = host ? `https://${host}` : (process.env.APP_URL ?? "");
  const sites = s?.widget_sites ?? [];
  const views = (stats ?? []).reduce((n, r) => n + r.views, 0);
  const continues = (stats ?? []).reduce((n, r) => n + r.continues, 0);

  return (
    <Card id="widget" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ActionForm action={saveWidgetSites} className="gap-4">
          <Field label={t("sites")} htmlFor="widget_sites" hint={t("sitesHint")}>
            <Textarea
              id="widget_sites"
              name="widget_sites"
              rows={3}
              placeholder="chaletstromy.sk"
              defaultValue={sites.map((x) => x.replace(/^https:\/\//, "")).join("\n")}
            />
          </Field>
          <SubmitButton>{tf("save")}</SubmitButton>
        </ActionForm>
        {sites.length === 0 ? (
          <p role="status" className="card-warm rounded-[10px] px-4 py-3 text-sm text-[#5b3a1f]">
            {t("noSites")}
          </p>
        ) : null}
        <div className="grid gap-4">
          {(properties ?? []).map((p) => (
            <CopyField
              key={p.slug}
              label={t("code", { name: p.name })}
              value={`<div data-booking-widget="kalendar" data-objekt="${p.slug}"></div><script src="${base}/widget.js" async></script>`}
            />
          ))}
          <p className="text-muted-foreground text-sm">{t("codeHint")}</p>
        </div>
        <p className="text-sm">{t("stats", { views, continues })}</p>
        <Link
          href="/admin/help?open=widget"
          className="text-primary justify-self-start text-sm font-medium underline underline-offset-4"
        >
          {t("help")}
        </Link>
      </CardContent>
    </Card>
  );
}
