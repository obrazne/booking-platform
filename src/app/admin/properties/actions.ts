"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { isPlatformAdmin } from "@/core/auth/session";
import { parseMinorUnits } from "@/core/format/format";
import { localizedFromForm } from "@/core/i18n/localized";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  .max(80);
const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v));
const intIn = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.iso.date().nullable());

function money(currency: string) {
  return z
    .string()
    .transform((v) => parseMinorUnits(v, currency))
    .pipe(z.number().int().min(0));
}

async function context() {
  const active = await requireTenant();
  const tenant = await getTenantInfo(active.tenantId);
  const supabase = await createClient();
  return { tenant, supabase };
}

function done(propertyId: string, path = "") {
  revalidatePath(`/admin/properties/${propertyId}${path}`);
  return ok();
}

// --------------------------------------------------------------------------------------------- property

export async function createProperty(_: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(120), slug })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("invalid");
  // New properties are created by the platform admin for now (v1.1).
  if (!(await isPlatformAdmin())) return fail("forbidden");
  const { tenant, supabase } = await context();

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      tenant_id: tenant.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return fail(dbErrorKey(error));
  // Every property has its (hidden) default unit and a default season, so prices can be entered right away.
  const [unit, season] = await Promise.all([
    supabase.from("units").insert({
      tenant_id: tenant.id,
      property_id: property.id,
      name: parsed.data.name,
      is_default: true,
    }),
    supabase.from("seasons").insert({
      tenant_id: tenant.id,
      property_id: property.id,
      name: { [tenant.defaultLocale]: "Celoročne" },
      is_default: true,
      min_nights: 1,
    }),
  ]);
  if (unit.error || season.error) return fail(dbErrorKey(unit.error ?? season.error));
  redirect(`/admin/properties/${property.id}`);
}

const detailsSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  slug,
  status: z.enum(["draft", "published", "archived"]),
  booking_mode: z.enum(["whole", "units"]),
  pricing_model: z.enum(["per_night", "per_person_night"]),
  street: optionalText,
  city: optionalText,
  postal_code: optionalText,
  country: z.string().trim().toUpperCase().length(2),
  max_guests: intIn(1, 500),
  bedrooms: intIn(0, 200),
  bathrooms: intIn(0, 200),
  check_in_from: z.string().regex(/^\d{2}:\d{2}$/),
  check_out_until: z.string().regex(/^\d{2}:\d{2}$/),
  cleaning_gap_days: intIn(0, 7),
  pets_allowed: checkbox,
  tourist_tax_included: checkbox,
  contact_email: optionalText,
  contact_phone: optionalText,
});

export async function updatePropertyDetails(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const parsed = detailsSchema.safeParse({
    ...Object.fromEntries(form),
    pets_allowed: form.get("pets_allowed"),
    tourist_tax_included: form.get("tourist_tax_included"),
  });
  const tax = parseMinorUnits(String(form.get("tourist_tax") ?? "0") || "0", tenant.currency);
  if (!parsed.success || tax === null || tax < 0) return fail("invalid");
  const { id, ...values } = parsed.data;
  const { error } = await supabase
    .from("properties")
    .update({ ...values, tourist_tax_cents: tax })
    .eq("id", id)
    .eq("tenant_id", tenant.id);
  if (error) return fail(dbErrorKey(error));
  return done(id);
}

export async function updatePropertyTexts(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return fail("invalid");
  const l = tenant.locales;
  const { error } = await supabase
    .from("properties")
    .update({
      summary: localizedFromForm(form, "summary", l),
      description: localizedFromForm(form, "description", l),
      house_rules: localizedFromForm(form, "house_rules", l),
      included: localizedFromForm(form, "included", l),
    })
    .eq("id", id.data)
    .eq("tenant_id", tenant.id);
  if (error) return fail(dbErrorKey(error));
  return done(id.data);
}

export async function updateArrival(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return fail("invalid");
  const { error } = await supabase.from("property_private").upsert({
    property_id: id.data,
    tenant_id: tenant.id,
    arrival_instructions: localizedFromForm(form, "arrival", tenant.locales),
  });
  if (error) return fail(dbErrorKey(error));
  // Module checkin (Z36): settings of online check-in of the property, when the form had them.
  if (form.get("checkin") === "1") {
    const days = String(form.get("checkin_reminder_days") ?? "")
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(Number);
    const opens = Number(form.get("checkin_opens_days_before"));
    if (
      !Number.isInteger(opens) ||
      opens < 0 ||
      opens > 90 ||
      days.length > 5 ||
      days.some((d) => !Number.isInteger(d) || d < 0 || d > 90)
    )
      return fail("invalid");
    const { error: e } = await supabase
      .from("properties")
      .update({
        checkin_opens_days_before: opens,
        checkin_reminder_days: [...new Set(days)].sort((a, b) => b - a),
        checkin_required_for_instructions: form.get("checkin_required_for_instructions") === "on",
      })
      .eq("id", id.data)
      .eq("tenant_id", tenant.id);
    if (e) return fail(dbErrorKey(e));
  }
  return done(id.data);
}

export async function updateTerms(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const id = z.uuid().safeParse(form.get("id"));
  const termIds = z.array(z.uuid()).safeParse(form.getAll("term"));
  if (!id.success || !termIds.success) return fail("invalid");
  const del = await supabase.from("property_terms").delete().eq("property_id", id.data);
  if (del.error) return fail(dbErrorKey(del.error));
  if (termIds.data.length > 0) {
    const { error } = await supabase
      .from("property_terms")
      .insert(
        termIds.data.map((term_id) => ({ property_id: id.data, term_id, tenant_id: tenant.id })),
      );
    if (error) return fail(dbErrorKey(error));
  }
  return done(id.data);
}

// --------------------------------------------------------------------------------------------- photos

export async function registerPhoto(input: {
  propertyId: string;
  storagePath: string;
  width: number;
  height: number;
}): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  if (!input.storagePath.startsWith(`${tenant.id}/${input.propertyId}/`)) return fail("forbidden");
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", input.propertyId);
  const { error } = await supabase.from("photos").insert({
    tenant_id: tenant.id,
    property_id: input.propertyId,
    storage_path: input.storagePath,
    width: input.width,
    height: input.height,
    sort: (count ?? 0) + 1,
  });
  if (error) return fail(dbErrorKey(error));
  return done(input.propertyId, "/photos");
}

export async function updatePhotoAlt(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const id = z.uuid().safeParse(form.get("id"));
  const propertyId = z.uuid().safeParse(form.get("property_id"));
  if (!id.success || !propertyId.success) return fail("invalid");
  const category = z
    .enum(["exterior", "interior", "bedrooms", "wellness", "surroundings"])
    .nullable()
    .catch(null)
    .parse(form.get("category") || null);
  const { error } = await supabase
    .from("photos")
    .update({ alt: localizedFromForm(form, "alt", tenant.locales), category })
    .eq("id", id.data);
  if (error) return fail(dbErrorKey(error));
  return done(propertyId.data, "/photos");
}

export async function movePhoto(propertyId: string, photoId: string, direction: -1 | 1) {
  const { supabase } = await context();
  const { data } = await supabase
    .from("photos")
    .select("id, sort")
    .eq("property_id", propertyId)
    .order("sort");
  const list = data ?? [];
  const i = list.findIndex((p) => p.id === photoId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await Promise.all(
    list.map((p, k) =>
      supabase
        .from("photos")
        .update({ sort: k + 1 })
        .eq("id", p.id),
    ),
  );
  revalidatePath(`/admin/properties/${propertyId}/photos`);
}

export async function deletePhoto(propertyId: string, photoId: string) {
  const { supabase } = await context();
  // The file stays 30 days so the photo can be restored from the trash (Z31); the job worker removes it later.
  await supabase.from("photos").delete().eq("id", photoId);
  revalidatePath(`/admin/properties/${propertyId}/photos`);
}

// --------------------------------------------------------------------------------------------- units

export async function saveUnit(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      property_id: z.uuid(),
      name: z.string().trim().min(1).max(120),
      max_guests: intIn(1, 500),
      active: checkbox,
    })
    .safeParse({
      ...Object.fromEntries(form),
      active: form.get("active") ?? (form.get("id") ? null : "on"),
    });
  if (!parsed.success) return fail("invalid");
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await supabase.from("units").update(values).eq("id", id)
    : await supabase.from("units").insert({ ...values, tenant_id: tenant.id });
  if (error) return fail(dbErrorKey(error));
  return done(values.property_id, "/units");
}

// --------------------------------------------------------------------------------------------- seasons and rates

const seasonSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  property_id: z.uuid(),
  priority: intIn(-100, 100),
  min_nights: intIn(1, 365),
  max_nights: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(365).nullable()),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .or(z.literal(""))
    .transform((v) => v || null),
  is_default: checkbox,
});

export async function saveSeason(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const parsed = seasonSchema.safeParse({
    ...Object.fromEntries(form),
    is_default: form.get("is_default"),
  });
  if (!parsed.success) return fail("invalid");
  const name = localizedFromForm(form, "name", tenant.locales);
  if (Object.keys(name).length === 0) return fail("invalid");
  const days = form
    .getAll("arrival_days")
    .map(Number)
    .filter((d) => d >= 1 && d <= 7);
  const { id, ...values } = parsed.data;
  const row = { ...values, name, arrival_days: days.length > 0 && days.length < 7 ? days : null };

  let seasonId = id;
  if (id) {
    const { error } = await supabase.from("seasons").update(row).eq("id", id);
    if (error) return fail(dbErrorKey(error));
  } else {
    const { data, error } = await supabase
      .from("seasons")
      .insert({ ...row, tenant_id: tenant.id })
      .select("id")
      .single();
    if (error) return fail(dbErrorKey(error));
    seasonId = data.id;
  }

  // Ranges: rows range_start[i] / range_end[i]; replaced as a whole.
  const starts = form.getAll("range_start").map(String);
  const ends = form.getAll("range_end").map(String);
  const repeat = form.get("repeat_yearly") === "on";
  const ranges = starts
    .map((start, i) => ({ start, end: ends[i] ?? "" }))
    .filter((r) => r.start && r.end);
  if (!values.is_default) {
    const del = await supabase.from("season_ranges").delete().eq("season_id", seasonId);
    if (del.error) return fail(dbErrorKey(del.error));
    if (ranges.length > 0) {
      const { error } = await supabase.from("season_ranges").insert(
        ranges.map((r) => ({
          tenant_id: tenant.id,
          season_id: seasonId,
          start_date: r.start,
          end_date: r.end,
          repeat_yearly: repeat,
        })),
      );
      if (error) return fail(dbErrorKey(error));
    }
  }

  // Rates per unit: rate_<unitId> = decimal amount.
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("rate_") || typeof value !== "string") continue;
    const unitId = key.slice(5);
    if (value.trim() === "") {
      await supabase.from("rates").delete().eq("unit_id", unitId).eq("season_id", seasonId);
      continue;
    }
    const cents = parseMinorUnits(value, tenant.currency);
    if (cents === null || cents < 0) return fail("invalid");
    const { error } = await supabase
      .from("rates")
      .upsert(
        { tenant_id: tenant.id, unit_id: unitId, season_id: seasonId, amount_cents: cents },
        { onConflict: "unit_id,season_id" },
      );
    if (error) return fail(dbErrorKey(error));
  }
  return done(values.property_id, "/pricing");
}

export async function deleteSeason(propertyId: string, seasonId: string) {
  const { supabase } = await context();
  await supabase.from("seasons").delete().eq("id", seasonId).eq("is_default", false);
  revalidatePath(`/admin/properties/${propertyId}/pricing`);
}

// --------------------------------------------------------------------------------------------- fees and discounts

export async function saveFee(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      property_id: z.uuid(),
      kind: z.enum(["automatic", "optional", "pet"]),
      price_model: z.enum(["per_stay", "per_night", "per_person", "per_person_night", "per_item"]),
      amount_cents: money(tenant.currency),
      refundable_deposit: checkbox,
      active: checkbox,
    })
    .safeParse({
      ...Object.fromEntries(form),
      amount_cents: form.get("amount"),
      refundable_deposit: form.get("refundable_deposit"),
      active: form.get("active"),
    });
  const name = localizedFromForm(form, "name", tenant.locales);
  if (!parsed.success || Object.keys(name).length === 0) return fail("invalid");
  const { id, ...values } = parsed.data;
  const row = { ...values, name };
  const { error } = id
    ? await supabase.from("fees").update(row).eq("id", id)
    : await supabase.from("fees").insert({ ...row, tenant_id: tenant.id });
  if (error) return fail(dbErrorKey(error));
  return done(values.property_id, "/extras");
}

export async function deleteFee(propertyId: string, id: string) {
  const { supabase } = await context();
  await supabase.from("fees").delete().eq("id", id);
  revalidatePath(`/admin/properties/${propertyId}/extras`);
}

export async function saveDiscount(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { tenant, supabase } = await context();
  const optionalInt = z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .pipe(z.number().int().min(1).max(1000).nullable());
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      property_id: z.uuid(),
      kind: z.enum(["length_of_stay", "promo"]),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9_-]*$/)
        .max(40)
        .transform((v) => v || null),
      percent: z
        .string()
        .transform((v) => (v.trim() === "" ? null : Math.round(Number(v.replace(",", ".")) * 100)))
        .pipe(z.number().int().min(1).max(10000).nullable()),
      fixed: z.string().default(""),
      min_nights: optionalInt,
      min_guests: optionalInt,
      max_guests: optionalInt,
      booked_from: optionalDate,
      booked_until: optionalDate,
      stay_from: optionalDate,
      stay_until: optionalDate,
      excluded_from: optionalDate,
      excluded_until: optionalDate,
      active: checkbox,
    })
    .safeParse({ ...Object.fromEntries(form), active: form.get("active") });
  const name = localizedFromForm(form, "name", tenant.locales);
  if (!parsed.success || Object.keys(name).length === 0) return fail("invalid");
  const { id, percent, fixed, ...v } = parsed.data;
  const amount = fixed.trim() ? parseMinorUnits(fixed, tenant.currency) : null;
  if ((percent === null) === (amount === null)) return fail("invalid");
  if (v.kind === "promo" && !v.code) return fail("invalid");
  if (v.kind === "length_of_stay" && !v.min_nights) return fail("invalid");
  const row = { ...v, name, percent_bp: percent, amount_cents: amount };
  const { error } = id
    ? await supabase.from("discounts").update(row).eq("id", id)
    : await supabase.from("discounts").insert({ ...row, tenant_id: tenant.id });
  if (error) return fail(dbErrorKey(error));
  return done(v.property_id, "/extras");
}

export async function deleteDiscount(propertyId: string, id: string) {
  const { supabase } = await context();
  await supabase.from("discounts").delete().eq("id", id);
  revalidatePath(`/admin/properties/${propertyId}/extras`);
}
