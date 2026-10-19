import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/core/auth/session";
import { HELP_TOPICS } from "@/core/help/faqs";
import { getEnabledModules } from "@/core/modules/registry";
import { loadHelp } from "@/core/search/load";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";
import { HelpView } from "./help-view";

/**
 * Pomoc (Z67, vizuál administrácie v1.5, doska 16): search, topics, questions with steps and a button to the page,
 * "Pomohlo vám to?", and "Nenašli ste odpoveď?" with the client, the person and the page they came from.
 */
export default async function HelpPage({ searchParams }: PageProps<"/admin/help">) {
  const t = await getTranslations("help");
  const active = await getActiveMembership();
  if (!active) return null;
  const sp = await searchParams;
  const supabase = await createClient();
  const [user, modules, { data: properties }] = await Promise.all([
    getCurrentUser(),
    getEnabledModules(active.tenantId),
    supabase.from("properties").select("id").eq("tenant_id", active.tenantId).limit(2),
  ]);
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const property = properties?.length === 1 ? properties[0]!.id : null;
  const faqs = await loadHelp(modules, property);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const from = one(sp.from);

  return (
    <div data-bleed>
      <div className="grid gap-7 px-5 pt-7 pb-14 md:px-10 md:pt-9">
        <HelpView
          faqs={faqs.map(({ id, topic, title, steps, go, href }) => ({
            id,
            topic,
            title,
            steps,
            go,
            href,
          }))}
          topics={HELP_TOPICS.map((key) => ({ key, label: t(`topics.${key}`) }))}
          open={one(sp.open)}
          context={{
            tenant: active.tenantName,
            user: profile?.full_name || user?.email || "",
            page: from.startsWith("/admin") ? from : "/admin/help",
          }}
        />
      </div>
    </div>
  );
}
