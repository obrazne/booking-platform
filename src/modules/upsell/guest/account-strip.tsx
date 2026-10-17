"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, X } from "lucide-react";

/** Phones (design `MobilPobyt`): a green strip at the bottom "Na účet pobytu · suma"; "Účet pobytu ▴" opens the card. */
export function AccountStrip({
  label,
  amount,
  open: openLabel,
  children,
}: {
  label: string;
  amount: string;
  open: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("modules.upsell.guest");
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Room for the strip so it never covers the end of the page. */}
      <div aria-hidden className="h-16" />
      <div className="bg-surface-accent fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white shadow-[0_-8px_24px_rgba(17,33,47,0.18)]">
        <span className="grid leading-tight">
          <span className="font-mono text-[10px] tracking-[0.1em] text-white uppercase">
            {label}
          </span>
          <span className="text-lg font-extrabold tabular-nums">{amount}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/40 px-4 text-sm font-medium"
        >
          {openLabel} <ChevronUp className="size-4" />
        </button>
      </div>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#11212f]/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            className="fixed inset-x-0 bottom-0 z-50 grid max-h-[85dvh] gap-3 overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between">
              <span id={id} className="text-ink text-lg font-extrabold">
                {openLabel}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                autoFocus
                aria-label={t("close")}
                className="inline-flex size-9 items-center justify-center rounded-full hover:bg-black/5"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}
