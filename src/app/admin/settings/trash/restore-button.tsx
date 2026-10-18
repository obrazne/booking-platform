"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreFromTrash, type RestoreResult } from "./actions";

/** "Obnoviť" with the answer right at the row (a collision is explained, not hidden). */
export function RestoreButton({ id, label }: { id: number; label: string }) {
  const t = useTranslations("history.trash");
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending || result === "ok"}
        aria-label={`${t("restore")}: ${label}`}
        onClick={() =>
          start(async () => {
            const r = await restoreFromTrash(id);
            setResult(r);
            // Toast too (rule 3); the reason of a refusal stays at the row.
            if (r === "ok") toast.success(t("restored"));
            else toast.error(t(`errors.${r}`));
          })
        }
      >
        <RotateCcw /> {t("restore")}
      </Button>
      {result ? (
        <p
          role="status"
          className={result === "ok" ? "text-primary text-[13px]" : "text-[13px] text-[#a8432f]"}
        >
          {result === "ok" ? t("restored") : t(`errors.${result}`)}
        </p>
      ) : null}
    </div>
  );
}
