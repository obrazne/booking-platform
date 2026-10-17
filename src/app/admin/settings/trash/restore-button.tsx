"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
        onClick={() => start(async () => setResult(await restoreFromTrash(id)))}
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
