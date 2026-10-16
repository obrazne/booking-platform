"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { CancelForm } from "./cancel-form";

/** "Copy" next to a payment detail; confirms with "Copied" for a moment. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("guest.confirm");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } catch {
          // clipboard not available — the value is visible and selectable anyway
        }
      }}
      aria-label={`${t("copy")}: ${label}`}
      className="border-line text-ink inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium hover:bg-[#f7f4ed]"
    >
      {done ? <Check className="text-primary size-3.5" /> : <Copy className="size-3.5" />}
      <span aria-live="polite">{done ? t("copied") : t("copy")}</span>
    </button>
  );
}

/** "Change of plans": one sentence, the form only after a click. */
export function CancelToggle({ token, label }: { token: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <CancelForm token={token} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="text-ink font-medium underline underline-offset-[3px]"
    >
      {label}
    </button>
  );
}
