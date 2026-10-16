"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getEnabledModules } from "@/core/modules/registry";
import { sectionTypes } from "@/core/sections/registry";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const active = await requireTenant();
  const supabase = await createClient();
  const modules = (await getEnabledModules(active.tenantId)).map((m) => m.key);
  return { tenantId: active.tenantId, supabase, types: sectionTypes(modules) };
}

function done(propertyId: string): ActionResult {
  revalidatePath(`/admin/properties/${propertyId}/page`);
  return ok();
}

async function loadSection(id: string) {
  const ctx = await context();
  if (!z.uuid().safeParse(id).success) return null;
  const { data } = await ctx.supabase
    .from("property_sections")
    .select("id, property_id, type, sort, enabled")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  return data ? { ...ctx, section: data } : null;
}

/** Switches a section on or off (the calendar with prices always stays on, B7). */
export async function toggleSection(id: string, enabled: boolean): Promise<ActionResult> {
  const c = await loadSection(id);
  if (!c) return fail("notFound");
  if (c.section.type === "calendar" && !enabled) return fail("calendarRequired");
  const { error } = await c.supabase.from("property_sections").update({ enabled }).eq("id", id);
  return error ? fail(dbErrorKey(error)) : done(c.section.property_id);
}

/** Moves a section one place up or down (order is renumbered by tens). */
export async function moveSection(id: string, direction: -1 | 1): Promise<ActionResult> {
  const c = await loadSection(id);
  if (!c) return fail("notFound");
  const { data: all } = await c.supabase
    .from("property_sections")
    .select("id, sort")
    .eq("property_id", c.section.property_id)
    .order("sort")
    .order("created_at");
  const list = [...(all ?? [])];
  const i = list.findIndex((s) => s.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return ok();
  [list[i], list[j]] = [list[j]!, list[i]!];
  for (const [n, s] of list.entries()) {
    if (s.sort === (n + 1) * 10) continue;
    const { error } = await c.supabase
      .from("property_sections")
      .update({ sort: (n + 1) * 10 })
      .eq("id", s.id);
    if (error) return fail(dbErrorKey(error));
  }
  return done(c.section.property_id);
}

/** Saves the content of a section; it must fit the zod schema of its type (otherwise nothing is stored). */
export async function saveSectionContent(id: string, content: unknown): Promise<ActionResult> {
  const c = await loadSection(id);
  if (!c) return fail("notFound");
  const def = c.types.get(c.section.type);
  if (!def) return fail("invalid");
  const parsed = def.schema.safeParse(content ?? {});
  if (!parsed.success) return fail("invalid");
  const { error } = await c.supabase
    .from("property_sections")
    .update({ content: parsed.data as never })
    .eq("id", id);
  return error ? fail(dbErrorKey(error)) : done(c.section.property_id);
}

/** Adds a section type that the page does not have yet, at the end (B7). */
export async function addSection(propertyId: string, type: string): Promise<ActionResult> {
  const ctx = await context();
  if (!z.uuid().safeParse(propertyId).success || !ctx.types.has(type)) return fail("invalid");
  const { data: existing } = await ctx.supabase
    .from("property_sections")
    .select("type, sort")
    .eq("property_id", propertyId)
    .eq("tenant_id", ctx.tenantId);
  if ((existing ?? []).some((s) => s.type === type)) return fail("duplicate");
  const sort = Math.max(0, ...(existing ?? []).map((s) => s.sort)) + 10;
  const { error } = await ctx.supabase
    .from("property_sections")
    .insert({ tenant_id: ctx.tenantId, property_id: propertyId, type, sort });
  return error ? fail(dbErrorKey(error)) : done(propertyId);
}

/** Removes a section (not the calendar); it can be added again, its texts are lost. */
export async function deleteSection(id: string): Promise<ActionResult> {
  const c = await loadSection(id);
  if (!c) return fail("notFound");
  if (c.section.type === "calendar") return fail("calendarRequired");
  const { error } = await c.supabase.from("property_sections").delete().eq("id", id);
  return error ? fail(dbErrorKey(error)) : done(c.section.property_id);
}

/** Replaces all sections by a template (texts of sections are lost — the page asks for confirmation). */
export async function resetSections(propertyId: string, template: string): Promise<ActionResult> {
  const ctx = await context();
  if (!z.uuid().safeParse(propertyId).success || !/^[a-z][a-z0-9_]*$/.test(template))
    return fail("invalid");
  const { error } = await ctx.supabase.rpc("owner_reset_sections", {
    p_property_id: propertyId,
    p_template: template,
  });
  return error ? fail(dbErrorKey(error)) : done(propertyId);
}
