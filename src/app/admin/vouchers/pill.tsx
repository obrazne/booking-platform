import { cn } from "@/lib/utils";
import type { GiftVoucherState } from "@/core/gift-vouchers/state";

const PILL: Record<GiftVoucherState, string> = {
  valid: "bg-primary text-primary-foreground",
  partial: "bg-[#e6efeb] text-[#2b6a50]",
  used: "bg-[#eef0f3] text-[#3b4652]",
  expired: "bg-[#f6ecdf] text-[#8a4a22]",
  cancelled: "bg-[#fbeceb] text-[#a8432f]",
};

/** State of a gift voucher (Z78) in the colours of rule 4. */
export function GiftVoucherPill({ state, label }: { state: GiftVoucherState; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        PILL[state],
      )}
    >
      {label}
    </span>
  );
}
