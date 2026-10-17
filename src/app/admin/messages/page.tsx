import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireTenant } from "@/core/admin/action";
import { FilterPills, ListSearch } from "@/core/admin/data-list";
import { PageHeader } from "@/core/admin/page-header";
import { PanelLink, UrlPanel } from "@/core/admin/record-panel";
import { formatDate } from "@/core/format/format";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { loadInbox, newMessageTargets, type InboxFilter } from "@/modules/messages/admin/data";
import { NewMessageButton } from "@/modules/messages/admin/new-message";
import { ensureMessageDefaults } from "@/modules/messages/defaults";
import { loadReservationPanel } from "../reservations/panel-loader";

/** Changes with every server render — tells the open panel to load its detail again after a change. */
function renderVersion(): string {
  return String(Date.now());
}

const FILTERS: InboxFilter[] = ["waiting", "upcoming", "past"];

/** Days between two ISO dates (b − a). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Správy › Schránka (Z46, design v1.3 `Spravy`): one conversation per direct reservation, those waiting for a reply
 * first. A row opens the reservation panel on the tab Správy (`?tab=messages`). Only with the module `messages` on.
 */
export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const active = await requireTenant();
  if (!(await isModuleEnabled(active.tenantId, "messages"))) notFound();
  await ensureMessageDefaults(active.tenantId);
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f === sp.filter) ?? "all";
  const search = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const supabase = await createClient();
  const [t, tn, locale, tenant, inbox, { count: rulesOn }, targets] = await Promise.all([
    getTranslations("modules.messages.admin"),
    getTranslations("modules.messages"),
    getLocale(),
    getTenantInfo(active.tenantId),
    loadInbox(active.tenantId, filter, search),
    supabase
      .from("message_rules")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", active.tenantId)
      .eq("enabled", true),
    newMessageTargets(active.tenantId),
  ]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(new Date());
  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(new Date(iso));
  const when = (iso: string) =>
    day(iso) === today
      ? new Intl.DateTimeFormat(locale, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: tenant.timezone,
        }).format(new Date(iso))
      : new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "numeric",
          timeZone: tenant.timezone,
        }).format(new Date(iso));
  const stay = (r: { check_in: string; check_out: string; status: string }) => {
    if (r.status === "cancelled") return { label: t("inbox.stayCancelled"), tone: "past" };
    if (r.check_out < today) return { label: t("inbox.stayPast"), tone: "past" };
    if (r.check_in <= today) return { label: t("inbox.stayNow"), tone: "now" };
    const n = daysBetween(today, r.check_in);
    return {
      label:
        n >= 14
          ? t("inbox.stayInWeeks", { count: Math.floor(n / 7) })
          : t("inbox.stayIn", { count: n }),
      tone: "soon",
    };
  };
  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter((w) => /^\p{L}/u.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("");

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={[{ label: tn("nav"), href: "/admin/messages" }, { label: tn("navInbox") }]}
        title={t("inbox.title")}
        actions={
          <span className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/admin/messages/auto"
              className="text-ink text-sm font-medium underline underline-offset-[3px]"
            >
              {t("inbox.autoLink", { count: rulesOn ?? 0 })}
            </Link>
            <NewMessageButton
              targets={targets.map((r) => ({
                id: r.id,
                number: r.number,
                guestName: r.guestName,
                dates: `${formatDate(r.checkIn, locale, "short")} – ${formatDate(r.checkOut, locale, "short")}`,
                hasThread: r.hasThread,
              }))}
            />
          </span>
        }
      />
      <div className="grid gap-4 px-5 pb-14 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterPills
            param="filter"
            label={t("inbox.title")}
            options={[
              { value: "", label: t("inbox.filters.all"), count: inbox.counts.all },
              ...FILTERS.map((f) => ({
                value: f,
                label: t(`inbox.filters.${f}`),
                count: inbox.counts[f],
              })),
            ]}
          />
          <ListSearch placeholder={t("inbox.search")} className="w-full sm:w-80" />
        </div>

        {inbox.rows.length ? (
          <ul className="border-line border-t" aria-label={t("inbox.title")}>
            {inbox.rows.map((r) => {
              const s = stay(r);
              const prefix =
                r.last_sender === "staff"
                  ? `${t("inbox.you")} `
                  : r.last_sender === "auto"
                    ? `${t("inbox.auto")} `
                    : "";
              return (
                <li key={r.reservation_id}>
                  <PanelLink
                    type="reservation"
                    id={r.reservation_id}
                    params={{ tab: "messages" }}
                    className="border-line grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b px-2 py-3.5 transition-colors hover:bg-[#fbfaf7]"
                  >
                    <span
                      aria-hidden
                      className="grid size-10 place-items-center rounded-full bg-[#e9efec] text-[13px] font-bold text-[#2f5d50]"
                    >
                      {initials(r.guest_name)}
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "text-ink truncate text-[15px]",
                            r.unread ? "font-bold" : "font-medium",
                          )}
                        >
                          {r.guest_name}
                        </span>
                        {r.unread ? (
                          <span className="size-2 shrink-0 rounded-full bg-[#c2552d]">
                            <span className="sr-only">{t("inbox.unread")}</span>
                          </span>
                        ) : null}
                        <span className="shrink-0 font-mono text-[11px] text-[#6b7480]">
                          {r.number}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "truncate text-[13px]",
                          r.waiting ? "text-ink" : "text-[#5a6672]",
                        )}
                      >
                        {prefix}
                        {r.last_body}
                      </span>
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <span className="text-xs text-[#6b7480]">{when(r.last_at)}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          s.tone === "now" && "bg-[#e9efec] text-[#2f5d50]",
                          s.tone === "soon" && "bg-[#f4efe4] text-[#7a5a1c]",
                          s.tone === "past" && "bg-[#f1f0ec] text-[#5a6672]",
                        )}
                        title={`${formatDate(r.check_in, locale, "short")} – ${formatDate(r.check_out, locale, "short")}`}
                      >
                        {s.label}
                      </span>
                    </span>
                  </PanelLink>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground py-8 text-sm">
            {inbox.counts.all ? t("inbox.emptyFilter") : t("inbox.empty")}
          </p>
        )}
        <p className="text-[13px] text-[#5a6672]">{t("inbox.portals")}</p>
      </div>
      <UrlPanel
        type="reservation"
        load={loadReservationPanel}
        version={renderVersion()}
        backLabel={t("inbox.title")}
      />
    </div>
  );
}
