"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayMonthText, parseDayMonth } from "./day-month";

type Row = { start: string; end: string };

/**
 * Editable list of date ranges of a season (submitted as range_start[] / range_end[] + repeat_yearly). A yearly range is
 * entered and shown as day and month ("23. 12."); it is stored as before, in the year 2000 (Z56).
 */
export function SeasonRanges({ initial, yearly }: { initial: Row[]; yearly: boolean }) {
  const t = useTranslations("pricing");
  const [rows, setRows] = useState<Row[]>(initial.length > 0 ? initial : [{ start: "", end: "" }]);
  const [repeat, setRepeat] = useState(yearly);
  const set = (i: number, key: keyof Row, value: string) =>
    setRows(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)));

  // Switching keeps the dates: yearly → the year 2000, a single year → this year (a range over New Year ends the next one).
  const toggle = (on: boolean) => {
    setRepeat(on);
    const year = new Date().getFullYear();
    setRows(
      rows.map((r) => {
        if (!r.start || !r.end) return r;
        if (on) return { start: `2000${r.start.slice(4)}`, end: `2000${r.end.slice(4)}` };
        const wraps = r.end.slice(5) < r.start.slice(5);
        return {
          start: `${year}${r.start.slice(4)}`,
          end: `${wraps ? year + 1 : year}${r.end.slice(4)}`,
        };
      }),
    );
  };

  return (
    <div className="grid gap-2">
      {rows.map((row, i) => (
        <div key={`${i}-${repeat}`} className="flex items-center gap-2">
          {repeat ? (
            <>
              <DayMonth
                label={t("rangeFrom")}
                name="range_start"
                value={row.start}
                onChange={(v) => set(i, "start", v)}
              />
              <span className="text-muted-foreground">–</span>
              <DayMonth
                label={t("rangeTo")}
                name="range_end"
                value={row.end}
                onChange={(v) => set(i, "end", v)}
              />
            </>
          ) : (
            <>
              <Input
                type="date"
                name="range_start"
                aria-label={t("rangeFrom")}
                value={row.start}
                onChange={(e) => set(i, "start", e.target.value)}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                name="range_end"
                aria-label={t("rangeTo")}
                value={row.end}
                onChange={(e) => set(i, "end", e.target.value)}
              />
            </>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("removeRange")}
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
      <Label className="font-normal">
        <Checkbox
          name="repeat_yearly"
          checked={repeat}
          onCheckedChange={(v) => toggle(v === true)}
        />
        {t("repeatYearly")}
      </Label>
    </div>
  );
}

/** Day and month of a yearly range: typed as "23. 12.", sent as 2000-12-23 in a hidden field. */
function DayMonth({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const t = useTranslations("pricing");
  const [text, setText] = useState(dayMonthText(value));
  const invalid = text.trim() !== "" && !parseDayMonth(text);
  return (
    <>
      <Input
        inputMode="decimal"
        aria-label={`${label} (${t("dayMonthHint")})`}
        aria-invalid={invalid || undefined}
        placeholder="23. 12."
        className="w-28"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseDayMonth(e.target.value) ?? "");
        }}
      />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
