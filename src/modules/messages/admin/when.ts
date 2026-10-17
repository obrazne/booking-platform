import type { MessageAnchor } from "../rules";

// Any translator bound to `modules.messages.admin` (next-intl's typed one is narrowed by the caller).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = (key: any, values?: any) => string;

/** "3 dni pred príchodom o 10:00", "hneď po potvrdení" — the same words in the conversation and the rules (Z46). */
export function ruleWhen(
  t: T,
  rule: { anchor: MessageAnchor; offsetDays: number; sendTime?: string | null },
  withTime = true,
): string {
  const n = Math.abs(rule.offsetDays);
  const base =
    rule.anchor === "confirmed"
      ? n === 0
        ? t("when.confirmedNow")
        : t("when.afterConfirmed", { count: n })
      : rule.offsetDays === 0
        ? t(rule.anchor === "check_in" ? "when.onArrival" : "when.onDeparture")
        : t(
            `when.${rule.offsetDays < 0 ? "before" : "after"}${rule.anchor === "check_in" ? "Arrival" : "Departure"}`,
            { count: n },
          );
  return withTime && rule.sendTime && rule.anchor !== "confirmed"
    ? `${base} ${t("when.at", { time: rule.sendTime.slice(0, 5) })}`
    : base;
}

/** Phase of the stay a rule belongs to on the timeline (design `SpravyAuto`). */
export function rulePhase(rule: { anchor: MessageAnchor; offsetDays: number }): number {
  if (rule.anchor === "confirmed") return 0;
  if (rule.anchor === "check_in") return rule.offsetDays < 0 ? 1 : 2;
  return rule.offsetDays < 0 ? 3 : 4;
}
