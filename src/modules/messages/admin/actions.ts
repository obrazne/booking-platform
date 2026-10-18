"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorKey, fail, ok, requireTenant } from "@/core/admin/action";
import type { ActionResult } from "@/core/admin/form";
import { getCurrentUser } from "@/core/auth/session";
import { fillMessagePreview } from "@/core/email/layout";
import { sendEmail } from "@/core/email/send";
import { createClient } from "@/lib/supabase/server";
import { ruleEmailTemplate } from "./email-preview";

const uuid = z.uuid();

function refresh() {
  // The badge in the menu, the inbox and the open panel (its version changes with the page).
  revalidatePath("/admin", "layout");
}

/** The team answers the guest (database `send_message`: e-mail to the guest after 15 minutes, merged). */
export async function sendStaffMessage(reservationId: string, body: string): Promise<ActionResult> {
  await requireTenant();
  const text = body.trim();
  if (!uuid.safeParse(reservationId).success || !text || text.length > 4000) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_reservation_id: reservationId,
    p_body: text,
  });
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

/** Opening the conversation marks it read for the whole team (one shared state). */
export async function markConversationRead(reservationId: string): Promise<void> {
  await requireTenant();
  if (!uuid.safeParse(reservationId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_messages_read", { p_reservation_id: reservationId });
}

/** A scheduled automatic message for this guest: left out, changed text, or back to the rule. */
export async function setScheduledOverride(
  reservationId: string,
  ruleId: string,
  skip: boolean,
  body: string | null,
): Promise<ActionResult> {
  await requireTenant();
  if (!uuid.safeParse(reservationId).success || !uuid.safeParse(ruleId).success)
    return fail("invalid");
  if (body && body.length > 4000) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_message_override", {
    p_reservation_id: reservationId,
    p_rule_id: ruleId,
    p_skip: skip,
    p_body: body ?? undefined,
  });
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

const ruleInput = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(80),
    anchor: z.enum(["confirmed", "check_in", "check_out"]),
    offsetDays: z.number().int().min(-60).max(60),
    sendTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
      .nullable(),
    body: z.string().trim().min(1).max(4000),
    locale: z.string().regex(/^[a-z]{2}$/),
  })
  .refine((r) => r.sendTime !== null || r.anchor === "confirmed");

/** Saves an automatic message (when and the text in the language edited). Applies to messages not sent yet. */
export async function saveRule(input: z.input<typeof ruleInput>): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = ruleInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const r = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("message_rules")
    .select("name, body")
    .eq("id", r.id)
    .eq("tenant_id", active.tenantId)
    .single();
  if (!current) return fail("invalid");
  const { error } = await supabase
    .from("message_rules")
    .update({
      name: { ...(current.name as object), [r.locale]: r.name },
      body: { ...(current.body as object), [r.locale]: r.body },
      anchor: r.anchor,
      offset_days: r.offsetDays,
      send_time: r.sendTime,
    })
    .eq("id", r.id)
    .eq("tenant_id", active.tenantId);
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

export async function toggleRule(id: string, enabled: boolean): Promise<ActionResult> {
  const active = await requireTenant();
  if (!uuid.safeParse(id).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("message_rules")
    .update({ enabled })
    .eq("id", id)
    .eq("tenant_id", active.tenantId);
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

/**
 * "Poslať skúšobne mne": the e-mail exactly as in the preview — the client's header and footer, the greeting, the
 * text with the sample guest (Z60) — to the signed-in member.
 */
export async function sendRuleTest(
  subject: string,
  text: string,
  sample: { guestName: string; checkIn: string; checkOut: string },
): Promise<ActionResult> {
  const active = await requireTenant();
  const user = await getCurrentUser();
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!user?.email || !text.trim() || !date.test(sample.checkIn) || !date.test(sample.checkOut))
    return fail("invalid");
  const template = await ruleEmailTemplate(active.tenantId, {
    guestName: sample.guestName.slice(0, 80),
    checkIn: sample.checkIn,
    checkOut: sample.checkOut,
  });
  const result = await sendEmail({
    to: user.email,
    subject: subject.slice(0, 120),
    html: fillMessagePreview(template.html, text.slice(0, 4000)),
    text: text.slice(0, 4000),
  });
  return result.ok ? ok() : fail("generic");
}

const quickInput = z.object({
  id: z.uuid().nullable(),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(4000),
});

export async function saveQuickReply(input: z.input<typeof quickInput>): Promise<ActionResult> {
  const active = await requireTenant();
  const parsed = quickInput.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const supabase = await createClient();
  const q = parsed.data;
  const { error } = q.id
    ? await supabase
        .from("quick_replies")
        .update({ title: q.title, body: q.body })
        .eq("id", q.id)
        .eq("tenant_id", active.tenantId)
    : await supabase.from("quick_replies").insert({
        tenant_id: active.tenantId,
        title: q.title,
        body: q.body,
        sort: 1000,
      });
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

export async function deleteQuickReply(id: string): Promise<ActionResult> {
  const active = await requireTenant();
  if (!uuid.safeParse(id).success) return fail("invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("quick_replies")
    .delete()
    .eq("id", id)
    .eq("tenant_id", active.tenantId);
  if (error) return fail(dbErrorKey(error));
  refresh();
  return ok();
}

/** New order of the quick replies (ids top to bottom). */
export async function orderQuickReplies(ids: string[]): Promise<ActionResult> {
  const active = await requireTenant();
  if (!ids.every((id) => uuid.safeParse(id).success) || ids.length > 100) return fail("invalid");
  const supabase = await createClient();
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase
      .from("quick_replies")
      .update({ sort: i })
      .eq("id", id)
      .eq("tenant_id", active.tenantId);
    if (error) return fail(dbErrorKey(error));
  }
  refresh();
  return ok();
}
