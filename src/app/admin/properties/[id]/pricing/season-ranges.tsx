"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Editable list of date ranges of a season (submitted as range_start[] / range_end[]). */
export function SeasonRanges({ initial }: { initial: { start: string; end: string }[] }) {
  const t = useTranslations("pricing");
  const [rows, setRows] = useState(initial.length > 0 ? initial : [{ start: "", end: "" }]);
  return (
    <div className="grid gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="date"
            name="range_start"
            aria-label={t("rangeFrom")}
            value={row.start}
            onChange={(e) =>
              setRows(rows.map((r, k) => (k === i ? { ...r, start: e.target.value } : r)))
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            name="range_end"
            aria-label={t("rangeTo")}
            value={row.end}
            onChange={(e) =>
              setRows(rows.map((r, k) => (k === i ? { ...r, end: e.target.value } : r)))
            }
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="×"
            onClick={() => setRows(rows.filter((_, k) => k !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start"
        onClick={() => setRows([...rows, { start: "", end: "" }])}
      >
        <Plus /> {t("addRange")}
      </Button>
    </div>
  );
}
