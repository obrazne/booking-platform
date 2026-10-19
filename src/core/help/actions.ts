"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/core/auth/session";
import { getActiveMembership } from "@/core/tenant/active";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const IMAGE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_IMAGE = 5 * 1024 * 1024;

export type SupportState = { ok: boolean; message: string } | null;

/**
 * "Nenašli ste odpoveď?" (Z67): the text, an optional picture (uploaded by the server into the private bucket), the
 * client, the person and the page. The database writes the request, tells the platform admin and queues the e-mail.
 */
export async function sendSupportRequest(
  _prev: SupportState,
  form: FormData,
): Promise<SupportState> {
  const t = await getTranslations("help.form");
  const [active, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!active || !user) return { ok: false, message: t("failed") };
  const message = String(form.get("message") ?? "").trim();
  if (!message) return { ok: false, message: t("empty") };
  if (message.length > 5000) return { ok: false, message: t("tooLong") };
  const page = String(form.get("page") ?? "").slice(0, 300) || "/admin/help";

  let path: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = IMAGE[image.type];
    if (!ext || image.size > MAX_IMAGE) return { ok: false, message: t("badImage") };
    path = `${active.tenantId}/${randomUUID()}.${ext}`;
    const { error } = await createAdminClient()
      .storage.from("support-attachments")
      .upload(path, image, { contentType: image.type });
    if (error) return { ok: false, message: t("failed") };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("support_request_create", {
    p_tenant_id: active.tenantId,
    p_page: page,
    p_message: message,
    // null = no picture (the generated types do not know the argument may be null)
    p_attachment_path: path as string,
    p_user_agent: ((await headers()).get("user-agent") ?? "").slice(0, 400),
  });
  if (error) {
    if (path) await createAdminClient().storage.from("support-attachments").remove([path]);
    return { ok: false, message: error.code === "P0001" ? t("tooMany") : t("failed") };
  }
  return { ok: true, message: t("sent", { email: user.email ?? "" }) };
}

/** "Pomohlo vám to? Áno / Nie" — one answer per person and question, the last one counts. */
export async function rateHelp(faqId: string, helpful: boolean): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(faqId)) return false;
  const [active, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!user) return false;
  const supabase = await createClient();
  const { error } = await supabase.from("help_feedback").upsert(
    {
      faq_id: faqId,
      user_id: user.id,
      tenant_id: active && !active.adminView ? active.tenantId : null,
      helpful,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "faq_id,user_id" },
  );
  return !error;
}
