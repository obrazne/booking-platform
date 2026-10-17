"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExpandableRow = {
  id: string;
  title: ReactNode;
  /** 1–2 key facts next to the name (price and how it is counted, source, dates…). */
  meta?: ReactNode;
  /** State at the content (Aktívna, Skrytá…), not pushed to the far edge (rule 8). */
  status?: ReactNode;
  /** Form or detail shown when the row is expanded. */
  content: ReactNode;
};

/**
 * Settings list as compact rows that expand in place (vizuál administrácie v1.1, rule 7): one row open at a time,
 * the add form hidden behind "Pridať …" (opens a new expanded row on top). Keyboard and screen readers:
 * the row is a button with `aria-expanded` controlling its region.
 */
export function ExpandableList({
  heading,
  description,
  rows,
  addLabel,
  newRow,
  empty,
}: {
  heading?: ReactNode;
  description?: ReactNode;
  rows: ExpandableRow[];
  addLabel?: string;
  /** Content of the new row (the add form); title shown in its header. */
  newRow?: { title: ReactNode; content: ReactNode };
  empty?: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [count, setCount] = useState(rows.length);
  // A new record arrived (the add form was saved) → close the new row.
  if (rows.length !== count) {
    setCount(rows.length);
    if (open === "new") setOpen(null);
  }
  const all: ExpandableRow[] =
    open === "new" && newRow
      ? [{ id: "new", title: newRow.title, content: newRow.content }, ...rows]
      : rows;

  return (
    <section className="grid gap-3">
      {heading || addLabel ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            {heading ? (
              <h2 className="text-ink text-xl font-extrabold tracking-tight">{heading}</h2>
            ) : null}
            {description ? (
              <p className="text-muted-foreground max-w-2xl text-sm font-normal">{description}</p>
            ) : null}
          </div>
          {addLabel && newRow ? (
            <Button
              type="button"
              onClick={() => setOpen("new")}
              disabled={open === "new"}
              className="font-bold"
            >
              <Plus /> {addLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
      {all.length === 0 ? (
        <p className="text-muted-foreground surface px-4 py-6 text-sm font-normal">{empty}</p>
      ) : (
        <ul className="border-hair grid overflow-hidden rounded-[10px] border">
          {all.map((row) => (
            <Row
              key={row.id}
              row={row}
              expanded={open === row.id}
              onToggle={() => setOpen(open === row.id ? null : row.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  row,
  expanded,
  onToggle,
}: {
  row: ExpandableRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <li
      className={cn("border-hair border-b last:border-b-0", expanded && "bg-[var(--surface-card)]")}
    >
      <button
        type="button"
        id={`${id}-h`}
        aria-expanded={expanded}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-14 w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-card)]"
      >
        <span className="text-ink min-w-0 text-[15px] font-bold">{row.title}</span>
        {row.meta ? (
          <span className="text-muted-foreground min-w-0 text-sm font-normal">{row.meta}</span>
        ) : null}
        {row.status ? <span className="shrink-0">{row.status}</span> : null}
        <ChevronDown
          className={cn(
            "text-muted-foreground ml-auto size-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={id}
        role="region"
        aria-labelledby={`${id}-h`}
        hidden={!expanded}
        className="px-4 pt-1 pb-5"
      >
        {expanded ? row.content : null}
      </div>
    </li>
  );
}

/** Small state pill for rows (Aktívna = accent, otherwise grey). */
export function RowState({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
        on ? "bg-accent-soft text-primary" : "bg-[#eef0f3] text-[#3b4652]",
      )}
    >
      {children}
    </span>
  );
}
