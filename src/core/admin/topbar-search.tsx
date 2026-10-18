"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Search of the top bar: finds reservations from any page (number, guest, e-mail) — it leads to the reservation list.
 * On the list itself it is hidden: the list has its own search next to the filters, two would be confusing (Z58).
 */
export function TopbarSearch({ label }: { label: string }) {
  const pathname = usePathname();
  if (pathname === "/admin/reservations") return <span className="flex-[0_1_380px]" aria-hidden />;
  return (
    <form action="/admin/reservations" className="flex-[0_1_380px]">
      <label className="bg-muted text-muted-foreground flex min-h-[42px] items-center gap-2.5 rounded-full px-3.5 text-sm">
        <Search className="size-4" />
        <input
          type="search"
          name="q"
          placeholder={label}
          aria-label={label}
          className="text-ink min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
    </form>
  );
}
