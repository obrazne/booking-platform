"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A select filter that applies at once (rule 4 — no "Filtrovať" button): the value lives in the URL, a change goes
 * back to the first page. For filters with many options (kind of record, person); few options → FilterPills.
 */
export function ParamSelect({
  param,
  label,
  allLabel,
  options,
  className,
}: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        next.delete("page");
        const qs = next.toString();
        start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
      }}
      className={cn(
        "border-input bg-background text-ink min-h-10 rounded-full border px-3.5 text-[13px] font-medium",
        pending && "opacity-70",
        className,
      )}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
