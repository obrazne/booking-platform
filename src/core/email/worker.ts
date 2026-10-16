import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadEmailContext } from "./context";
import { sendEmail } from "./send";
import { renderEmail, type EmailKind } from "./templates";

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
      if (!job.reservation_id || job.kind === "owner_ical_conflict") {
        // iCal conflict mails are rendered by the iCal module (Z12); others need a reservation.
        await admin.from("email_outbox").update({ status: "skipped" }).eq("id", job.id);
        stats.skipped += 1;
        continue;
      }
      const ctx = await loadEmailContext(job.reservation_id);
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
