import "server-only";
import { after } from "next/server";
import { processEmailQueue } from "@/core/email/worker";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * After a reservation is created: keep the encrypted access token for links in later e-mails and send the queued
 * messages right after the response (the database queued them; the minute worker is the fallback).
 */
export async function notifyReservationCreated(
  reservationId: string,
  accessToken: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("store_access_token", { p_reservation_id: reservationId, p_token: accessToken });
  after(() => processEmailQueue().then(() => undefined));
}

/** Any status change done by staff or the guest: send what the database queued. */
export async function flushEmails(): Promise<void> {
  after(() => processEmailQueue().then(() => undefined));
}
