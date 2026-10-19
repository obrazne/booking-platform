"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setMonthlyReportEmail } from "./actions";

/** "Mesačný výpis e-mailom" (Z62): on by default, saved at once with a toast (rule 3 — instant switches). */
export function ReportEmailSwitch({ initial }: { initial: boolean }) {
  const t = useTranslations("notifications.settings");
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="bg-card flex items-start justify-between gap-4 rounded-[10px] border px-5 py-4">
      <div className="grid gap-0.5">
        <span id="report-email-label" className="text-ink text-sm font-bold">
          {t("reportEmail")}
        </span>
        <span className="text-muted-foreground text-[13px]">{t("reportEmailHint")}</span>
      </div>
      <Switch
        checked={on}
        disabled={pending}
        aria-labelledby="report-email-label"
        onCheckedChange={(v) =>
          start(async () => {
            const r = await setMonthlyReportEmail(v);
            if (r.ok) {
              setOn(v);
              toast.success(t(v ? "reportEmailOn" : "reportEmailOff"));
            } else toast.error(t("reportEmailFailed"));
          })
        }
      />
    </div>
  );
}
