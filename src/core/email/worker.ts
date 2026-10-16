import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadEmailContext } from "./context";
import { isReservedRecipient, sendEmail } from "./send";
import { renderEmail, renderIcalConflict, type EmailKind } from "./templates";

/**
 * Sends queued e-mails (outbox): claims a batch, renders, sends through Resend, records the result.
 * Failures are retried with growing delays (2, 4, 8, 16 min), then marked failed — visible in the outbox (A9 alerts later).
 */
export async function processEmailQueue(
  limit = 20,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const admin = createAdminClient();
  const { data: jobs } = await admin.rpc("claim_email_jobs", { p_limit: limit });
  const stats = { sent: 0, failed: 0, skipped: 0 };
  for (const job of jobs ?? []) {
    try {
      if (job.kind === "owner_ical_conflict") {
        // Conflicts of a channel that was switched off or removed (also browser tests) are not worth an e-mail.
        const channelId = (job.payload as { channel_id?: string } | null)?.channel_id;
        const { data: channel } = channelId
          ? await admin.from("ical_channels").select("active").eq("id", channelId).maybeSingle()
          : { data: null };
        if (!channel?.active) {
          await admin
            .from("email_outbox")
            .update({ status: "skipped", last_error: "channel inactive or removed" })
            .eq("id", job.id);
          stats.skipped += 1;
          continue;
        }
        const mail = await icalConflictMail(
          job.tenant_id,
          (job.payload ?? {}) as Record<string, unknown>,
        );
        if (!mail) {
          await admin
            .from("email_outbox")
            .update({ status: "skipped", last_error: "no recipient" })
            .eq("id", job.id);
          stats.skipped += 1;
          continue;
        }
        const result = await sendEmail(mail);
        await admin.rpc("finish_email_job", {
          p_id: job.id,
          p_ok: result.ok,
          p_provider_id: result.ok ? result.id : "",
          p_error: result.ok ? "" : result.error,
          p_to: mail.to,
        });
        if (result.ok) stats.sent += 1;
        else stats.failed += 1;
        continue;
      }
      if (!job.reservation_id) {
        await admin.from("email_outbox").update({ status: "skipped" }).eq("id", job.id);
        stats.skipped += 1;
        continue;
      }
      const ctx = await loadEmailContext(job.reservation_id);
      // Test reservations (guest e-mail on a reserved domain such as booking-platform.test): no e-mail to anybody,
      // not even to the owner — keeps the sending quota for real guests.
      if (ctx && isReservedRecipient(ctx.r.guest_email)) {
        await admin
          .from("email_outbox")
          .update({ status: "skipped", last_error: "test reservation" })
          .eq("id", job.id);
        stats.skipped += 1;
        continue;
      }
      const mail = ctx
        ? await renderEmail(
            job.kind as EmailKind,
            ctx,
            (job.payload ?? {}) as Record<string, unknown>,
          )
        : null;
      if (!mail) {
        await admin
          .from("email_outbox")
          .update({ status: "skipped", last_error: "no recipient" })
          .eq("id", job.id);
        stats.skipped += 1;
        continue;
      }
      const result = await sendEmail(mail);
      await admin.rpc("finish_email_job", {
        p_id: job.id,
        p_ok: result.ok,
        p_provider_id: result.ok ? result.id : "",
        p_error: result.ok ? "" : result.error,
        p_to: mail.to,
      });
      if (result.ok) stats.sent += 1;
      else stats.failed += 1;
    } catch (e) {
      await admin.rpc("finish_email_job", {
        p_id: job.id,
        p_ok: false,
        p_provider_id: "",
        p_error: e instanceof Error ? e.message : String(e),
        p_to: "",
      });
      stats.failed += 1;
    }
  }
  return stats;
}

async function icalConflictMail(tenantId: string, payload: Record<string, unknown>) {
  const admin = createAdminClient();
  const [{ data: tenant }, { data: settings }, { data: theme }] = await Promise.all([
    admin.from("tenants").select("name, default_locale").eq("id", tenantId).single(),
    admin
      .from("tenant_settings")
      .select("owner_notification_email")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin.from("tenant_themes").select("primary_color").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  return renderIcalConflict(
    {
      name: tenant?.name ?? "",
      ownerEmail: settings?.owner_notification_email ?? null,
      accent: theme?.primary_color ?? "#2f5d50",
      locale: tenant?.default_locale ?? "sk",
      adminUrl: `${process.env.APP_URL ?? ""}/admin/calendar`,
    },
    payload as { channel?: string; conflicts?: { start: string; end: string }[] },
  );
}
