"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMarketingSpend } from "./actions";

/**
 * Z75: what the owner spent on own marketing in the month (optional). Saved per month; the report then shows what is
 * left of the budget. Other roles see the value only.
 */
export function MarketingSpend({
  month,
  cents,
  shown,
  canEdit,
}: {
  month: string;
  cents: number | null;
  shown: string | null;
  canEdit: boolean;
}) {
  const t = useTranslations("report");
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(cents === null ? "" : String(cents / 100));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!canEdit)
    return (
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-[#5a6672]">{t("spentLabel")}</span>
        <span className="text-ink font-bold">{shown ?? t("spentNone")}</span>
      </div>
    );

  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveMarketingSpend(month, value);
          if (r.ok) {
            setError(null);
            toast.success(t("spentSaved"));
            router.refresh();
          } else if (r.error === "invalid") setError(t("spentInvalid"));
          else toast.error(t("spentFailed"));
        });
      }}
    >
      <label htmlFor={id} className="text-ink text-sm font-bold">
        {t("spentLabel")}
      </label>
      <div className="flex items-center gap-2">
        {/* The unit next to the field — the admin's rounded fields keep their own padding. */}
        <span className="flex items-center gap-1.5">
          <Input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            className="w-32 text-right tabular-nums"
          />
          <span className="text-sm text-[#5a6672]" aria-hidden>
            €
          </span>
        </span>
        <Button type="submit" variant="outline" disabled={pending}>
          {t("spentSave")}
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-[#5a6672]">
        {t("spentHint")}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </form>
  );
}
