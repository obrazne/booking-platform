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

export async function isModuleEnabled(tenantId: string, key: string): Promise<boolean> {
  return (await getEnabledModules(tenantId)).some((m) => m.key === key);
}

/** Dispatches a booking event to every enabled module listening to it. Core does not know which ones. */
export async function emitBookingEvent(name: BookingEventName, event: ModuleEvent): Promise<void> {
  const modules = await getEnabledModules(event.tenantId);
  await Promise.all(modules.map((m) => m.events?.[name]?.(event)));
}

export async function slotComponents(tenantId: string, slot: SlotName) {
  const modules = await getEnabledModules(tenantId);
  return modules.flatMap((m) => {
    const Component = m.slots?.[slot];
    return Component ? [{ key: m.key, Component }] : [];
  });
}
