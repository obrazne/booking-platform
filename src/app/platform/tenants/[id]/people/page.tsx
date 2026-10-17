import { getLocale, getTranslations } from "next-intl/server";
import { formatDate, formatDateTime } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";
import { loadTenantDetail, TenantHeader } from "../tenant-header";

/** Client detail — Ľudia: the client's team with role and last sign-in (test accounts are not listed). */
export default async function TenantPeople({ params }: PageProps<"/platform/tenants/[id]/people">) {
  const { id } = await params;
  const tenant = await loadTenantDetail(id);
  const [t, tAll, locale] = await Promise.all([
    getTranslations("platform.detail"),
    getTranslations(),
    getLocale(),
  ]);
  const ids = tenant.people.map((p) => p.user_id);
  const supabase = await createClient();
  const { data: signIns } = ids.length
    ? await supabase
        .from("audit_log")
        .select("actor_id, created_at")
        .eq("action", "auth.signed_in")
        .in("actor_id", ids)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] };
  const last = new Map<string, string>();
  for (const s of signIns ?? []) {
    if (s.actor_id && !last.has(s.actor_id)) last.set(s.actor_id, s.created_at);
  }
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="people" />
      <div className="grid max-w-[880px] gap-4 px-5 pt-6 pb-14 md:px-10">
        {tenant.people.length ? (
          <ul className="surface overflow-hidden">
            {tenant.people.map((p) => {
              const signedIn = last.get(p.user_id);
              return (
                <li
                  key={p.user_id}
                  className="border-hair grid gap-1 border-b px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_140px_220px] sm:items-center"
                >
                  <span className="grid min-w-0 [overflow-wrap:anywhere]">
                    <span className="text-ink font-medium">
                      {p.profile?.full_name ?? p.profile?.email}
                    </span>
                    {p.profile?.full_name ? (
                      <span className="text-muted-foreground text-[13px]">{p.profile.email}</span>
                    ) : null}
                  </span>
                  <span className="text-sm">{tAll(`team.roles.${p.role as "owner"}`)}</span>
                  <span className="text-muted-foreground text-[13px]">
                    {signedIn
                      ? t("lastSignIn", {
                          date: formatDateTime(signedIn, locale, tenant.timezone, "short"),
                        })
                      : t("memberSince", { date: formatDate(p.created_at.slice(0, 10), locale) })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noPeople")}</p>
        )}
      </div>
    </div>
  );
}
