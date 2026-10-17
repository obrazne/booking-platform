import "server-only";
import { cache } from "react";
import { MODULES } from "@/modules";
import { createClient } from "@/lib/supabase/server";
import { isEnabledStatus, resolveEnabled } from "./resolve";
import type { BookingEventName, ModuleEvent, ModuleManifest, SlotName } from "./types";

/** All modules known to the code (control center lists them with their switches). */
export function listModules(): readonly ModuleManifest[] {
  return MODULES;
}

export function getModule(key: string): ModuleManifest | undefined {
  return MODULES.find((m) => m.key === key);
}

/** Modules switched on for the tenant (read with the signed-in user's rights, RLS applies). */
export const getEnabledModules = cache(async (tenantId: string): Promise<ModuleManifest[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_modules")
    .select("module_key, status, trial_ends_at")
    .eq("tenant_id", tenantId);
  const today = new Date().toISOString().slice(0, 10);
  const keys = new Set(
    (data ?? [])
      .filter((r) => isEnabledStatus(r.status, r.trial_ends_at, today))
      .map((r) => r.module_key),
  );
  return resolveEnabled(MODULES, keys);
});

/** Module switch checked by the database function — works for anonymous guests too (no access to tenant_modules). */
export const isModuleEnabledPublic = cache(
  async (tenantId: string, key: string): Promise<boolean> => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("is_module_enabled", {
      p_tenant_id: tenantId,
      p_module_key: key,
    });
    return data === true;
  },
);

/** Keys of modules switched on for the tenant, checked publicly (guest pages, price contributors). */
export async function enabledModuleKeysPublic(tenantId: string): Promise<string[]> {
  const flags = await Promise.all(MODULES.map((m) => isModuleEnabledPublic(tenantId, m.key)));
  return MODULES.filter((_, i) => flags[i]).map((m) => m.key);
}

export async function isModuleEnabled(tenantId: string, key: string): Promise<boolean> {
  return (await getEnabledModules(tenantId)).some((m) => m.key === key);
}

/** Dispatches a booking event to every enabled module listening to it. Core does not know which ones. */
export async function emitBookingEvent(name: BookingEventName, event: ModuleEvent): Promise<void> {
  const modules = await getEnabledModules(event.tenantId);
  await Promise.all(modules.map((m) => m.events?.[name]?.(event)));
}

export async function slotComponents(tenantId: string, slot: SlotName) {
  // Guests cannot read tenant_modules — their places check the switches through the database function.
  const modules = slot.startsWith("guest.")
    ? resolveEnabled(MODULES, new Set(await enabledModuleKeysPublic(tenantId)))
    : await getEnabledModules(tenantId);
  return modules.flatMap((m) => {
    const Component = m.slots?.[slot];
    return Component ? [{ key: m.key, Component }] : [];
  });
}
