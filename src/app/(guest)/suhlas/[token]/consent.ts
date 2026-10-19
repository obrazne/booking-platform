"use server";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const valid = (token: string) => /^[0-9a-f]{48}$/.test(token);

/** What the page of the link shows — nothing changes by opening it. */
export async function consentRequestInfo(token: string) {
  if (!valid(token)) return null;
  const { data } = await createAdminClient().rpc("guest_consent_request_info", {
    p_token_hash: hash(token),
  });
  return data?.[0] ?? null;
}

/** "Áno, chcem dostávať ponuky": the database writes the consent (source owner_request). */
export async function confirmConsent(token: string): Promise<boolean> {
  if (!valid(token)) return false;
  const { data } = await createAdminClient().rpc("guest_consent_confirm", {
    p_token_hash: hash(token),
  });
  return data === true;
}
