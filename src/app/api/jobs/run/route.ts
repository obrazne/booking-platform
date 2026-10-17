import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processEmailQueue } from "@/core/email/worker";
import { syncDueChannels } from "@/core/ical/sync";
import { purgeTrashFiles } from "@/core/history/purge-files";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Background worker, pinged every minute by pg_cron (see migration email_outbox) with the CRON_SECRET.
 * Syncs iCal channels (conflicts queue owner mails), queues scheduled e-mails, sends the outbox and removes files of
 * photos and documents that stayed in the trash for 30 days.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const ical = await syncDueChannels();
  const { data: queued } = await admin.rpc("enqueue_scheduled_emails");
  const emails = await processEmailQueue();
  const purgedFiles = await purgeTrashFiles();
  return NextResponse.json({ ical, queued, emails, purgedFiles });
}
