"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isPlatformAdmin } from "@/core/auth/session";
import { moduleCatalog } from "@/core/modules/catalog";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error: "invalidInput" | "slugTaken" | "error" | "trialNeedsDate" | null;
  ok?: boolean;
};

const tenantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .max(63),
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+$/)
    .max(253),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
});

export async function createTenant(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isPlatformAdmin())) return { error: "error" };
  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalidInput" };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_create_tenant", {
    p_name: v.name,
    p_slug: v.slug,
    p_hostname: v.hostname,
    p_country: v.country,
    p_currency: v.currency,
  });
  if (error) return { error: error.code === "23505" ? "slugTaken" : "error" };
  revalidatePath("/platform");
  redirect(`/platform/tenants/${data}`);
}

const moduleSchema = z.object({
  tenantId: z.uuid(),
  moduleKey: z.string().regex(/^[a-z][a-z0-9_]*$/),
  status: z.enum(["trial", "active", "off"]),
  trialEndsAt: z.union([z.iso.date(), z.literal("")]).optional(),
});

export async function setModule(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isPlatformAdmin())) return { error: "error" };
  const parsed = moduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalidInput" };
  const v = parsed.data;
  if (v.status === "trial" && !v.trialEndsAt) return { error: "trialNeedsDate" };
  // Modules in preparation (no guest screens yet) can only be switched off.
  const entry = moduleCatalog().find((m) => m.key === v.moduleKey);
  if (!entry || (!entry.ready && v.status !== "off")) return { error: "invalidInput" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_module", {
    p_tenant_id: v.tenantId,
    p_module_key: v.moduleKey,
    p_status: v.status,
    p_trial_ends_at: v.status === "trial" ? v.trialEndsAt : undefined,
  });
  if (error) return { error: "error" };
  // The module is shown in the catalog, trials, the client list and the client's detail.
  revalidatePath("/platform", "layout");
  return { error: null, ok: true };
}

const statusSchema = z.object({
  tenantId: z.uuid(),
  status: z.enum(["onboarding", "active", "suspended"]),
});

export async function setTenantStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isPlatformAdmin())) return { error: "error" };
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalidInput" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_tenant_status", {
    p_tenant_id: parsed.data.tenantId,
    p_status: parsed.data.status,
  });
  if (error) return { error: "error" };
  revalidatePath(`/platform/tenants/${parsed.data.tenantId}`);
  revalidatePath("/platform");
  return { error: null, ok: true };
}
