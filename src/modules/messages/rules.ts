import { localMidnight } from "@/core/time/zone";

/** Anchor of an automatic message (B11): the confirmation of the reservation, the arrival, the departure. */
export type MessageAnchor = "confirmed" | "check_in" | "check_out";

export type MessageRule = {
  anchor: MessageAnchor;
  /** Days after the anchor (negative = before). */
  offsetDays: number;
  /** "HH:MM" in the client's time zone; null = right at the confirmation. */
  sendTime: string | null;
};

/** Variables of the texts — the same names as `message_rule_text` in the database fills in. */
export const MESSAGE_VARIABLES = [
  "{meno}",
  "{príchod}",
  "{odchod}",
  "{podpis}",
  "{odkaz na hodnotenie}",
] as const;

/** A text of a rule for one stay (preview in the administration, blocks in e-mails) — as the database does. */
export function fillMessageText(
  template: string,
  v: {
    guestName: string;
    checkIn: string;
    checkOut: string;
    signature: string;
    reviewLink: string;
  },
): string {
  const date = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d}. ${m}. ${y}`;
  };
  return template
    .replaceAll("{meno}", v.guestName.trim().split(/\s+/)[0] ?? "")
    .replaceAll("{príchod}", date(v.checkIn))
    .replaceAll("{odchod}", date(v.checkOut))
    .replaceAll("{podpis}", v.signature)
    .replaceAll("{odkaz na hodnotenie}", v.reviewLink);
}

/** When a rule is due for a stay (as `message_rule_at`); null for the confirmation when it is not known. */
export function ruleSendAt(
  rule: MessageRule,
  stay: { checkIn: string; checkOut: string; confirmedAt: string | null },
  timeZone: string,
): Date | null {
  if (rule.anchor === "confirmed") {
    if (!stay.confirmedAt) return null;
    return new Date(Date.parse(stay.confirmedAt) + rule.offsetDays * 86_400_000);
  }
  const base = rule.anchor === "check_in" ? stay.checkIn : stay.checkOut;
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + rule.offsetDays);
  const [h, m] = (rule.sendTime ?? "10:00").split(":").map(Number);
  return new Date(
    localMidnight(d.toISOString().slice(0, 10), timeZone).getTime() + (h! * 60 + m!) * 60_000,
  );
}

/**
 * What {podpis} becomes (Z60) — as `message_rule_text` in the database: the signature of Nastavenia → Kontakt, else the
 * contact person's name, else the client's name.
 */
export function messageSignature(
  settings: { message_signature?: string | null; contact_name?: string | null } | null | undefined,
  tenantName: string,
): string {
  return settings?.message_signature?.trim() || settings?.contact_name?.trim() || tenantName;
}
