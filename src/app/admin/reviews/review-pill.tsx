import { StatusPill } from "@/core/admin/status";

/** Review states in the colours of the reservation states: waiting = beige, published = accent, rejected = red. */
const AS: Record<string, string> = {
  submitted: "pending_payment",
  published: "confirmed",
  rejected: "cancelled",
};

export function ReviewPill({ status, label }: { status: string; label: string }) {
  return <StatusPill status={AS[status] ?? "completed"} label={label} />;
}
