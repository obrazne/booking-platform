import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelSection } from "@/core/admin/record-panel";
import { formatDate, formatDateTime } from "@/core/format/format";
import type { SlotProps } from "@/core/modules/types";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MarkReported, RevealPerson } from "./person-actions";

const TONE: Record<string, string> = {
  not_started: "bg-[#eef0f3] text-[#3b4652]",
  in_progress: "bg-[#f6ecdf] text-[#8a4a22]",
  completed: "bg-primary text-primary-foreground",
};

/**
 * "Check-in" in the reservation panel (Z36, slot booking.detail.tabs): state, arrival time, persons with documents
 * masked; the owner reveals them (audited), prints the form for a foreigner and marks the report.
 */
export async function CheckinSection({ tenantId, locale, reservationId }: SlotProps) {
  if (!reservationId) return null;
  const [t, active] = await Promise.all([
    getTranslations("modules.checkin.section"),
    getActiveMembership(),
  ]);
  const owner = active?.role === "owner";
  const supabase = await createClient();
  const [{ data: checkin }, { data: people }, { data: tenant }] = await Promise.all([
    supabase
      .from("checkins")
      .select("status, arrival_time, house_rules_accepted_at, completed_at")
      .eq("reservation_id", reservationId)
      .maybeSingle(),
    supabase.rpc("checkin_people", { p_reservation_id: reservationId }),
    supabase.from("tenants").select("timezone").eq("id", tenantId).single(),
  ]);
  const status = checkin?.status ?? "not_started";
  const today = new Date().toISOString().slice(0, 10);
  const country = (code: string | null) => {
    try {
      return code ? (new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code) : "";
    } catch {
      return code ?? "";
    }
  };

  return (
    <PanelSection
      label={t("title")}
      aside={
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
            TONE[status] ?? TONE.not_started,
          )}
        >
          {t(`statuses.${status as "completed"}`)}
        </span>
      }
    >
      {!checkin ? (
        <p className="text-muted-foreground text-sm">{t("notStarted")}</p>
      ) : (
        <div className="grid gap-3 text-sm">
          <p className="text-muted-foreground text-[13px]">
            {[
              checkin.arrival_time ? t("arrivalTime", { time: checkin.arrival_time }) : null,
              checkin.house_rules_accepted_at ? t("houseRules") : null,
              checkin.completed_at
                ? formatDateTime(
                    checkin.completed_at,
                    locale,
                    tenant?.timezone ?? "Europe/Bratislava",
                    "short",
                  )
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {people?.length ? (
            <ul className="border-line grid rounded-[10px] border">
              {people.map((p) => {
                const name = `${p.first_name} ${p.last_name}`;
                return (
                  <li
                    key={p.id}
                    className="border-hair grid gap-1.5 border-b px-4 py-3 last:border-b-0"
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-ink font-semibold">{name}</span>
                      <span className="text-muted-foreground text-[13px]">
                        {p.is_citizen
                          ? t("citizen")
                          : t("foreigner", { country: country(p.nationality) })}
                      </span>
                    </span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      {p.purged ? (
                        <span>{t("purged")}</span>
                      ) : (
                        <>
                          <span className="font-mono">
                            {p.document_type
                              ? `${t(`documents.${p.document_type as "passport"}`)} `
                              : ""}
                            {p.document_masked ?? "—"}
                          </span>
                          {owner && (p.document_masked || p.has_birth_date) ? (
                            <RevealPerson id={p.id} name={name} />
                          ) : null}
                        </>
                      )}
                      {p.address ? <span>{p.address}</span> : null}
                    </span>
                    {!p.is_citizen && !p.purged ? (
                      <span className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span
                          className={cn(
                            !p.reported_at && p.report_due && p.report_due < today
                              ? "font-semibold text-[#a8432f]"
                              : "text-muted-foreground",
                          )}
                        >
                          {p.reported_at
                            ? t("reported", {
                                date: formatDate(p.reported_at.slice(0, 10), locale, "short"),
                              })
                            : p.report_due
                              ? t(p.report_due < today ? "reportOverdue" : "reportDue", {
                                  date: formatDate(p.report_due, locale, "short"),
                                })
                              : null}
                        </span>
                        {owner ? (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={`/admin/arrivals/report/${p.id}`}
                              target="_blank"
                              rel="noopener"
                            >
                              <FileText /> {t("reportPdf")}
                            </a>
                          </Button>
                        ) : null}
                        <MarkReported id={p.id} reported={Boolean(p.reported_at)} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {owner ? null : <p className="text-muted-foreground text-[13px]">{t("ownerOnly")}</p>}
        </div>
      )}
    </PanelSection>
  );
}
