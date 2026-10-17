import { cn } from "@/lib/utils";

/**
 * Colours of reservation states and occupancy (vizuál administrácie v1, rule 4) — the one place used by the list,
 * the panel, the overview and the calendar. Paid = accent with white text, waiting for payment = warm beige,
 * finished and portals = grey, cancelled = the only red.
 */
export type ReservationStatusKey =
  "pending_payment" | "confirmed" | "in_progress" | "completed" | "cancelled";

const PILL: Record<ReservationStatusKey, string> = {
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
  portal: "bg-[#9aa4b0] text-white",
  block: "hatch-block text-[#3b3d42] border border-[#d6d3cb]",
};

/** Occupancy kind of a reservation by its state and source. */
export function occupancyOfReservation(status: string, source: string): OccupancyKind {
  if (source === "booking" || source === "airbnb") return "portal";
  return status === "pending_payment" ? "pending" : "direct";
}
