"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Overview (Z65): "Tento mesiac / Ďalší mesiac" over the nights bar — both rendered on the server, the switch is instant. */
export function NightsSwitch({
  label,
  tabs,
}: {
  label: string;
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]!.key);
  return (
    <div className="grid gap-3">
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              active === tab.key
                ? "border-ink bg-ink text-white"
                : "border-input text-foreground bg-background hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} hidden={active !== tab.key}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
