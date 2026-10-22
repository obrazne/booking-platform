import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { requestHost } from "@/core/tenant/current";

/** Counts a view of the widget or a click on "Pokračovať na rezerváciu" (Z83) — counters only, no visitor data. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    slug?: unknown;
    kind?: unknown;
  } | null;
  const slug = typeof body?.slug === "string" ? body.slug.slice(0, 120) : "";
  const kind = body?.kind === "continue" ? "continue" : body?.kind === "view" ? "view" : null;
  const host = await requestHost();
  if (slug && kind && host) {
    const supabase = createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.rpc("widget_track", { p_host: host, p_slug: slug, p_kind: kind });
  }
  return new Response(null, { status: 204 });
}
