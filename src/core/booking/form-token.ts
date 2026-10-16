import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Secret for signing guest form tokens (a dedicated FORM_SECRET, otherwise derived from the server key). */
function secret(): string {
  const s = process.env.FORM_SECRET ?? process.env.SUPABASE_SECRET_KEY;
  if (!s) throw new Error("FORM_SECRET missing");
  return s;
}

function sign(issuedAt: number): string {
  return createHmac("sha256", secret()).update(`booking-form:${issuedAt}`).digest("base64url");
}

/** Token "<issuedAt>.<hmac>" issued by the server when the guest reaches the payment step. */
export function issueFormToken(now = Date.now()): string {
  return `${now}.${sign(now)}`;
}

/**
 * Valid when signed by us, at least `minMs` old (people need time to fill the form, bots do not wait)
 * and at most a day old. The time comes from the server, so a bot cannot fake it.
 */
export function verifyFormToken(token: string, minMs: number, now = Date.now()): boolean {
  const [ts, mac] = token.split(".");
  const issuedAt = Number(ts);
  if (!Number.isSafeInteger(issuedAt) || !mac) return false;
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = now - issuedAt;
  return age >= minMs && age <= 24 * 3600_000;
}
