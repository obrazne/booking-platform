import { cn } from "@/lib/utils";

/**
 * Colours of reservation states and occupancy (vizuál administrácie v1, rule 4) — the one place used by the list,
 * the panel, the overview and the calendar. Paid = accent with white text, waiting for payment = warm beige,
 * finished and portals = grey, cancelled = the only red.
 */
export type ReservationStatusKey =
  "awaiting_approval" | "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled";

const PILL: Record<ReservationStatusKey, string> = {
  // Z77: waits for the owner — its own colour, so it stands out from "waiting for payment".
  awaiting_approval: "bg-[#e9e6f5] text-[#4a3d8a]",
  pending_payment: "bg-[#f6ecdf] text-[#8a4a22]",
  confirmed: "bg-primary text-primary-foreground",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-[#eef0f3] text-[#3b4652]",
  cancelled: "bg-[#fbeceb] text-[#a8432f]",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        PILL[status as ReservationStatusKey] ?? PILL.completed,
        className,
      )}
    >
      {label}
    </span>
  );
}

/** What occupies a night in the calendar and the overview. */
export type OccupancyKind = "direct" | "pending" | "portal" | "block";

export const OCCUPANCY_CLASS: Record<OccupancyKind, string> = {
  direct: "bg-primary text-primary-foreground",
  pending: "bg-[#f6ecdf] text-[#8a4a22] border border-[#e8cfb3]",
  // Z61: #6b7480 keeps white text at 4.8 : 1 (was #9aa4b0, 2.5 : 1).
  portal: "bg-[#6b7480] text-white",
  block: "hatch-block text-[#3b3d42] border border-[#d6d3cb]",
};

/** Occupancy kind of a reservation by its state and source. */
export function occupancyOfReservation(status: string, source: string): OccupancyKind {
  if (source === "booking" || source === "airbnb") return "portal";
  return status === "pending_payment" || status === "awaiting_approval" ? "pending" : "direct";
}
