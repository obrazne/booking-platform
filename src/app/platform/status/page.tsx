import { getLocale, getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { PageHeader } from "@/core/admin/page-header";
import { loadTenants } from "@/core/admin/platform-data";
import { isDemoCalendar } from "@/core/admin/tenant-snapshot";
import { isPlatformAdmin } from "@/core/auth/session";
import { formatDateTime } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BackupsSection } from "./backups-section";

/**
 * Control center — Stav systému: the backups (Z52), then checks per client (synchronisation, e-mails, last sync and
 * send).
 */
export default async function PlatformStatus() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tm, locale, list] = await Promise.all([
    getTranslations("platform"),
    getTranslations("adminV1.status"),
    getLocale(),
    loadTenants(),
  ]);
  const supabase = await createClient();
  const [{ data: channels }, { data: failed }, { data: sent }] = await Promise.all([
    supabase
      .from("ical_channels")
      .select("tenant_id, name, import_url, active, last_status, last_error, last_sync_at"),
    supabase.from("email_outbox").select("tenant_id").eq("status", "failed"),
    supabase
      .from("email_outbox")
      .select("tenant_id, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(500),
  ]);
  const when = (v: string | null | undefined) =>
    v ? formatDateTime(v, locale, "Europe/Bratislava", "short") : tm("never");

  return (
    <div data-bleed>
      <PageHeader
        help="platformStatus"
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={tm("title")}
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <BackupsSection />
        {list.map((x) => {
          // Demo calendars (example.invalid) are never downloaded — not a failing synchronisation (v1.2).
          const all = (channels ?? []).filter((c) => c.tenant_id === x.id);
          const own = all.filter((c) => !isDemoCalendar(c.import_url));
          const demo = all.length - own.length;
          const bad = own.filter(
            (c) => c.active && (c.last_status === "error" || c.last_status === "conflict"),
          );
          const failedCount = (failed ?? []).filter((f) => f.tenant_id === x.id).length;
          const lastSync = own
            .map((c) => c.last_sync_at)
            .filter(Boolean)
            .sort()
            .at(-1);
          const lastSent = (sent ?? []).find((s) => s.tenant_id === x.id)?.sent_at;
          const ok = bad.length === 0 && failedCount === 0;
          return (
            <section key={x.id} className="surface grid gap-3 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn("size-2.5 rounded-full", ok ? "bg-[#3f8f5a]" : "bg-[#c07a3e]")}
                />
                <h2 className="text-ink text-lg font-extrabold">{x.name}</h2>
                <span className="text-muted-foreground text-sm">{ok ? tm("ok") : tm("check")}</span>
              </div>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div className="grid gap-0.5">
                  <dt className="label-mono">{tm("sync")}</dt>
                  <dd>
                    {own.length === 0
                      ? tm("noChannels")
                      : bad.length
                        ? tm("syncBad", { count: bad.length })
                        : tm("syncOk", { count: own.length })}{" "}
                    · {tm("last", { date: when(lastSync) })}
                    {demo ? ` · ${tm("demoChannels", { count: demo })}` : ""}
                  </dd>
                </div>
                <div className="grid gap-0.5">
                  <dt className="label-mono">{tm("emails")}</dt>
                  <dd>
                    {failedCount ? tm("emailsFailed", { count: failedCount }) : tm("emailsOk")} ·{" "}
                    {tm("lastSent", { date: when(lastSent) })}
                  </dd>
                </div>
              </dl>
              {bad.map((c) => (
                <p
                  key={c.name}
                  className="card-warm rounded-[10px] px-3.5 py-2.5 text-sm text-[#5b3a1f]"
                >
                  {c.name}: {c.last_error ?? c.last_status}
                </p>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
