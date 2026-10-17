import "server-only";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantSnapshot } from "@/core/admin/tenant-snapshot";
import { formatDate, formatDateTime } from "@/core/format/format";
import { listModules } from "@/core/modules/registry";
import { cn } from "@/lib/utils";

function Dot({ tone }: { tone: "ok" | "warn" | "off" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full",
        tone === "ok" ? "bg-[#3f8f5a]" : tone === "warn" ? "bg-[#c07a3e]" : "bg-[#c9cdd2]",
      )}
    />
  );
}

/**
 * A client at a glance (control center v1.2): in an expanded row of the client list and on the client's overview.
 * `actions` adds Otvoriť detail · Otvoriť administráciu ↗ · Stránka pre hostí ↗.
 */
export async function SnapshotView({
  s,
  domain,
  actions = false,
}: {
  s: TenantSnapshot;
  domain: string | null;
  actions?: boolean;
}) {
  const [t, tAll, locale] = await Promise.all([
    getTranslations("platform.snapshot"),
    getTranslations(),
    getLocale(),
  ]);
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: s.currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  const moduleName = (key: string) => {
    const m = listModules().find((x) => x.key === key);
    return m ? tAll(`${m.messages}.title` as Parameters<typeof tAll>[0]) : key;
  };
  // Demo calendars (never downloaded) do not count as connected ones.
  const real = s.calendars.filter((c) => !c.demo).length;
  const numbers = [
    { label: t("revenueThisMonth"), value: money(s.revenueThisMonth) },
    { label: t("revenueLastMonth"), value: money(s.revenueLastMonth) },
    {
      label: t("reservations30"),
      value: String(s.reservations30),
      note: s.lastReservation
        ? t("lastReservation", {
            number: s.lastReservation.number,
            date: formatDate(s.lastReservation.at.slice(0, 10), locale),
          })
        : t("noReservation"),
    },
    {
      label: t("occupancy90"),
      value: s.occupancy90 == null ? "—" : `${s.occupancy90} %`,
      note: t("occupancyNote"),
    },
  ];

  return (
    <div className="grid gap-5 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {numbers.map((n) => (
          <div key={n.label} className="grid content-start gap-1">
            <dt className="label-mono">{n.label}</dt>
            <dd className="text-ink text-xl font-extrabold tabular-nums">{n.value}</dd>
            {n.note ? <dd className="text-muted-foreground text-[13px]">{n.note}</dd> : null}
          </div>
        ))}
      </dl>
      <div className="grid gap-5 md:grid-cols-3">
        <section className="grid content-start gap-2">
          <h3 className="label-mono">{t("health")}</h3>
          <ul className="grid gap-1.5">
            <li className="flex items-center gap-2">
              <Dot tone={s.failingCalendars ? "warn" : real ? "ok" : "off"} />
              {s.failingCalendars
                ? t("syncFailing", { count: s.failingCalendars })
                : real
                  ? t("syncOk", { count: real })
                  : t("syncNone")}
              {s.calendars.some((c) => c.demo) ? (
                <span className="text-muted-foreground text-xs">· {t("demoCalendars")}</span>
              ) : null}
            </li>
            <li className="flex items-center gap-2">
              <Dot tone={s.failedEmails ? "warn" : "ok"} />
              {s.failedEmails ? t("emailsFailed", { count: s.failedEmails }) : t("emailsOk")}
            </li>
          </ul>
        </section>
        <section className="grid content-start gap-2">
          <h3 className="label-mono">{t("modules")}</h3>
          {s.modules.length ? (
            <ul className="grid gap-1.5">
              {s.modules.map((m) => (
                <li key={m.key}>
                  <span className="text-ink font-medium">{moduleName(m.key)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ·{" "}
                    {m.status === "trial"
                      ? m.trialEndsAt
                        ? t("trialUntil", { date: formatDate(m.trialEndsAt.slice(0, 10), locale) })
                        : t("trial")
                      : t("active")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("noModules")}</p>
          )}
        </section>
        <section className="grid content-start gap-2">
          <h3 className="label-mono">{t("owner")}</h3>
          {s.owner ? (
            <ul className="grid gap-1 [overflow-wrap:anywhere]">
              {s.owner.name ? <li className="text-ink font-medium">{s.owner.name}</li> : null}
              {s.owner.email ? <li>{s.owner.email}</li> : null}
              {s.owner.phone ? <li>{s.owner.phone}</li> : null}
              <li className="text-muted-foreground text-[13px]">
                {s.owner.lastSignIn
                  ? t("lastSignIn", {
                      date: formatDateTime(
                        s.owner.lastSignIn,
                        locale,
                        "Europe/Bratislava",
                        "short",
                      ),
                    })
                  : t("neverSignedIn")}
              </li>
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("noOwner")}</p>
          )}
        </section>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild className="font-bold">
            <Link href={`/platform/tenants/${s.id}`}>{t("openDetail")}</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={`/platform/enter/${s.id}`} target="_blank" rel="noreferrer">
              {t("openAdmin")} <ArrowUpRight />
            </a>
          </Button>
          {domain ? (
            <Button asChild variant="outline">
              <a href={`https://${domain}`} target="_blank" rel="noreferrer">
                {t("guestPage")} <ArrowUpRight />
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
