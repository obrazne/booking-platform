"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, isPlatformAdmin } from "@/core/auth/session";
import { platformBrand } from "@/core/admin/brand";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { PushScope } from "./load";
import { NOTIFICATION_KINDS } from "@/core/notifications/text";
import { sendToDevice } from "./send";

const kinds = z.array(z.enum(NOTIFICATION_KINDS)).max(NOTIFICATION_KINDS.length);
const subscription = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Client of the scope: the active client in the administration, null in the control center. */
async function scopeTenant(scope: PushScope): Promise<string | null | undefined> {
  if (scope === "platform") return (await isPlatformAdmin()) ? null : undefined;
  return (await getActiveMembership())?.tenantId;
}

function refresh(scope: PushScope) {
  revalidatePath(
    scope === "platform" ? "/platform/notifications" : "/admin/settings?tab=upozornenia",
  );
}

/** Saves this browser's subscription as my device (RLS: own device, module on / platform admin). */
export async function savePushDevice(
  scope: PushScope,
  input: unknown,
  device: string,
  chosen: string[],
): Promise<{ ok: boolean; id?: string }> {
  const user = await getCurrentUser();
  const tenantId = await scopeTenant(scope);
  const sub = subscription.safeParse(input);
  const k = kinds.safeParse(chosen);
  if (!user || tenantId === undefined || !sub.success || !k.success) return { ok: false };
  const supabase = await createClient();
  const fields = {
    p256dh: sub.data.keys.p256dh,
    auth: sub.data.keys.auth,
    device: device.slice(0, 120),
    kinds: k.data,
  };
  // The user may change only these columns of an existing device (column grants), so no upsert.
  let existing = supabase.from("push_subscriptions").select("id").eq("endpoint", sub.data.endpoint);
  existing = tenantId ? existing.eq("tenant_id", tenantId) : existing.is("tenant_id", null);
  const { data: found } = await existing.maybeSingle();
  const { data, error } = found
    ? await supabase
        .from("push_subscriptions")
        .update(fields)
        .eq("id", found.id)
        .select("id")
        .single()
    : await supabase
        .from("push_subscriptions")
        .insert({ ...fields, user_id: user.id, tenant_id: tenantId, endpoint: sub.data.endpoint })
        .select("id")
        .single();
  if (error) console.error("push device", error.message);
  if (error || !data) return { ok: false };
  refresh(scope);
  return { ok: true, id: data.id };
}

/** Kinds chosen for one of my devices. */
export async function updatePushKinds(
  scope: PushScope,
  id: string,
  chosen: string[],
): Promise<{ ok: boolean }> {
  const k = kinds.safeParse(chosen);
  if (!z.uuid().safeParse(id).success || !k.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ kinds: k.data })
    .eq("id", id);
  if (!error) refresh(scope);
  return { ok: !error };
}

/** Removes one of my devices (RLS: only own). */
export async function removePushDevice(scope: PushScope, id: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);
  if (!error) refresh(scope);
  return { ok: !error };
}

/** "Poslať skúšobné upozornenie" to one of my devices. */
export async function sendTestPush(
  scope: PushScope,
  id: string,
): Promise<{ status: "sent" | "gone" | "failed" | "not_configured" }> {
  if (!z.uuid().safeParse(id).success) return { status: "failed" };
  const supabase = await createClient();
  // Read with my rights first: only my own device can be tested.
  const { data: device } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failures")
    .eq("id", id)
    .maybeSingle();
  if (!device) return { status: "failed" };
  const t = await getTranslations("push");
  const status = await sendToDevice(device, {
    title: t("testTitle"),
    body: t("testBody", { name: platformBrand.name }),
    url: scope === "platform" ? "/platform/notifications" : "/admin/settings?tab=upozornenia",
    tag: "test",
  });
  refresh(scope);
  return { status };
}
