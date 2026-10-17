import "server-only";
import { isModuleEnabled } from "@/core/modules/registry";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured } from "./send";

export type PushScope = "tenant" | "platform";

export type MyPushDevice = {
  id: string;
  endpoint: string;
  device: string;
  kinds: string[];
  createdAt: string;
  lastSuccessAt: string | null;
};

/** My devices of the scope (RLS: own only) and whether push can be switched on here. */
export async function loadPushState(scope: PushScope, tenantId: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, device, kinds, created_at, last_success_at")
    .order("created_at", { ascending: true });
  query = tenantId ? query.eq("tenant_id", tenantId) : query.is("tenant_id", null);
  const [{ data }, moduleOn] = await Promise.all([
    query,
    scope === "platform" || !tenantId ? Promise.resolve(true) : isModuleEnabled(tenantId, "push"),
  ]);
  const devices: MyPushDevice[] = (data ?? []).map((d) => ({
    id: d.id,
    endpoint: d.endpoint,
    device: d.device,
    kinds: d.kinds,
    createdAt: d.created_at,
    lastSuccessAt: d.last_success_at,
  }));
  return {
    devices,
    moduleOn,
    publicKey: pushConfigured() ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! : null,
  };
}
