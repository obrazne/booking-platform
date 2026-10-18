import { getLocale, getTranslations } from "next-intl/server";
import { formatDateTime } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { RestoreTestForm } from "./restore-form";

const STALE_MS = 36 * 3_600_000;
const RESTORE_OLD_MS = 92 * 86_400_000;

/**
 * Stav systému › Zálohy (Z52): the last nightly backup (verified by a restore in the same run), the last successful
 * one when the last failed, a warning after 36 hours without a successful one, and the last test restore.
 */
export async function BackupsSection() {
  const [t, locale] = await Promise.all([getTranslations("adminV1.status.backups"), getLocale()]);
  const supabase = await createClient();
  const [{ data: runs }, { data: lastOk }, { data: restore }] = await Promise.all([
    supabase
      .from("platform_backups")
      .select("id, ok, finished_at, size_bytes, tables_compared, files, run_url")
      .eq("kind", "backup")
      .order("finished_at", { ascending: false })
      .limit(7),
    supabase
      .from("platform_backups")
      .select("finished_at, size_bytes, tables_compared, files, run_url")
      .eq("kind", "backup")
      .eq("ok", true)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("platform_backups")
      .select("finished_at, note")
      .eq("kind", "restore_test")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const when = (v: string) => formatDateTime(v, locale, "Europe/Bratislava", "short");
  const mb = (b: number | null) =>
    b == null
      ? "—"
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(b / 1_048_576)} MB`;
  const details = (r: {
    size_bytes: number | null;
    tables_compared: number | null;
    files: number | null;
  }) =>
    t("details", {
      size: mb(r.size_bytes),
      tables: r.tables_compared ?? 0,
      files: r.files ?? 0,
    });
  const last = runs?.[0] ?? null;
  // Server time of this render — the page is dynamic, rendered on each request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const stale = Boolean(last) && (!lastOk || now - Date.parse(lastOk.finished_at) > STALE_MS);
  const restoreOld = !restore || now - Date.parse(restore.finished_at) > RESTORE_OLD_MS;
  const ok = Boolean(last?.ok) && !stale;

  return (
    <section className="surface grid gap-4 p-5" aria-labelledby="backups-title">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "size-2.5 rounded-full",
            ok ? "bg-[#3f8f5a]" : last ? "bg-[#c07a3e]" : "bg-[#9aa3ad]",
          )}
        />
        <h2 id="backups-title" className="text-ink text-lg font-extrabold">
          {t("title")}
        </h2>
      </div>
      <p className="text-muted-foreground max-w-prose text-sm">{t("lead")}</p>
      {stale ? (
        <p role="alert" className="card-warm rounded-[10px] px-3.5 py-2.5 text-sm text-[#5b3a1f]">
          {t("stale")}
        </p>
      ) : null}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div className="grid gap-0.5">
          <dt className="label-mono">{t("last")}</dt>
          <dd>
            {last ? (
              <>
                {when(last.finished_at)} · {last.ok ? t("okLabel") : t("failed")}
                {last.ok ? <span className="block text-[#5a6672]">{details(last)}</span> : null}
                {last.run_url ? (
                  <a
                    href={last.run_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink block underline underline-offset-[3px]"
                  >
                    {t("run")}
                  </a>
                ) : null}
              </>
            ) : (
              t("none")
            )}
          </dd>
        </div>
        {last && !last.ok && lastOk ? (
          <div className="grid gap-0.5">
            <dt className="label-mono">{t("lastOk")}</dt>
            <dd>
              {when(lastOk.finished_at)}
              <span className="block text-[#5a6672]">{details(lastOk)}</span>
            </dd>
          </div>
        ) : null}
        <div className="grid gap-0.5">
          <dt className="label-mono">{t("restore")}</dt>
          <dd>
            {restore ? (
              <>
                {when(restore.finished_at)}
                {restore.note ? <span className="block text-[#5a6672]">{restore.note}</span> : null}
              </>
            ) : null}
            {restoreOld ? (
              <span className="block text-[#8a4a22]">
                {restore ? t("restoreOld") : t("restoreNone")}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
      {runs && runs.length > 1 ? (
        <div className="grid gap-1.5">
          <h3 className="label-mono">{t("history")}</h3>
          <ul className="flex flex-wrap gap-1.5" aria-label={t("history")}>
            {runs.map((r) => (
              <li
                key={r.id}
                title={`${when(r.finished_at)} · ${r.ok ? t("okLabel") : t("failed")}`}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  r.ok ? "bg-[#e9efec] text-[#2f5d50]" : "bg-[#f6ecdf] text-[#8a4a22]",
                )}
              >
                {new Intl.DateTimeFormat(locale, {
                  day: "numeric",
                  month: "numeric",
                  timeZone: "Europe/Bratislava",
                }).format(new Date(r.finished_at))}{" "}
                {r.ok ? "✓" : "✗"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <RestoreTestForm />
    </section>
  );
}
