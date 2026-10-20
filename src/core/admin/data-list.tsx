"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { pageItems, pageSizeCookie } from "./list-params";

const ALL = "__all";

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  function update(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  return { params, update, pending };
}

export type ListFilter = {
  param: string;
  label: string;
  options: { value: string; label: string }[];
};

/** Search box, filters and CSV export above a list. State lives in the URL; data is filtered on the server. */
export function DataListToolbar({
  filters = [],
  exportHref,
}: {
  filters?: ListFilter[];
  exportHref?: string;
}) {
  const t = useTranslations("common");
  const { params, update, pending } = useUpdateParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => update({ q }), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on the typed value
  }, [q]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="pl-8"
        />
      </div>
      {filters.map((f) => (
        <Select
          key={f.param}
          value={params.get(f.param) ?? ALL}
          onValueChange={(v) => update({ [f.param]: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-44" aria-label={f.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {f.label}: {t("all")}
            </SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {exportHref ? (
        <Button variant="outline" asChild className="ml-auto">
          <a href={`${exportHref}?${params.toString()}`} download>
            <Download /> {t("exportCsv")}
          </a>
        </Button>
      ) : null}
    </div>
  );
}

/** Column header that toggles server-side sorting via the URL. */
export function SortHeader({
  column,
  children,
  defaultDir,
}: {
  column: string;
  children: ReactNode;
  /** This column is the list's default order (Z73): shown active without `?sort=` in the address. */
  defaultDir?: "asc" | "desc";
}) {
  const { params, update } = useUpdateParams();
  const sort = params.get("sort");
  const active = sort === column || (!sort && Boolean(defaultDir));
  const dir = active ? (params.get("dir") ?? defaultDir ?? null) : null;
  const Icon = !active ? ArrowUpDown : dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      className="hover:text-foreground inline-flex items-center gap-1"
      onClick={() =>
        update({ sort: column, dir: active && dir !== "desc" ? "desc" : "asc" }, false)
      }
    >
      {children}
      <Icon className={cn("size-3.5", !active && "opacity-40")} />
    </button>
  );
}

/**
 * Paging under a list (rule 7): "1–20 z 8 149", pages, rows per page 20 / 50 / 100 — the size is remembered for the list
 * (cookie) and kept in the URL like the page, filters and search. Only one page is ever loaded from the database.
 */
export function Pagination({
  page,
  pageSize,
  total,
  list,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Key of the list for the remembered page size ("rezervacie", "audit"…). */
  list?: string;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const href = (p: number, size?: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    if (size) next.set("size", String(size));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const fmt = (n: number) => n.toLocaleString("sk-SK");
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  const arrow =
    "inline-flex size-9 items-center justify-center rounded-full hover:bg-[var(--hover-row)]";
  return (
    <nav
      aria-label={t("paging")}
      className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm"
    >
      <span role="status">{t("range", { from: fmt(from), to: fmt(to), total: fmt(total) })}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {pages > 1 ? (
          <ul className="flex items-center gap-0.5">
            <li>
              <Link
                href={href(current - 1)}
                aria-label={t("previous")}
                aria-disabled={current <= 1}
                className={cn(arrow, current <= 1 && "pointer-events-none opacity-40")}
              >
                <ChevronLeft className="size-4" />
              </Link>
            </li>
            {pageItems(current, pages).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} aria-hidden className="px-1">
                  …
                </li>
              ) : (
                <li key={p}>
                  <Link
                    href={href(p)}
                    aria-label={t("pageN", { page: p })}
                    aria-current={p === current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 tabular-nums",
                      p === current
                        ? "bg-ink font-bold text-white"
                        : "text-ink hover:bg-[var(--hover-row)]",
                    )}
                  >
                    {p}
                  </Link>
                </li>
              ),
            )}
            <li>
              <Link
                href={href(current + 1)}
                aria-label={t("next")}
                aria-disabled={current >= pages}
                className={cn(arrow, current >= pages && "pointer-events-none opacity-40")}
              >
                <ChevronRight className="size-4" />
              </Link>
            </li>
          </ul>
        ) : null}
        <label className="flex items-center gap-2">
          {t("perPage")}
          <select
            value={pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              if (list) {
                document.cookie = `${pageSizeCookie(list)}=${size}; path=/; max-age=31536000; samesite=lax`;
              }
              router.replace(href(1, size), { scroll: false });
            }}
            className="h-9 rounded-full px-3 text-sm"
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </nav>
  );
}

/** Search field of a list (pill; state in `?q=`, debounced). */
export function ListSearch({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const { params, update, pending } = useUpdateParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => update({ q }), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on the typed value
  }, [q]);
  return (
    <label
      className={cn(
        "field-box text-muted-foreground flex min-h-10 items-center gap-2.5 rounded-full px-3.5 text-sm",
        pending && "opacity-70",
        className,
      )}
    >
      <Search className="size-4 shrink-0" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-field="bare"
        className="text-ink min-w-0 flex-1 bg-transparent outline-none"
      />
    </label>
  );
}

/** Filter as pills with counts (e.g. reservation states); the selected one is graphite. */
export function FilterPills({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  /** First option with value "" = all. */
  options: { value: string; label: string; count?: number }[];
}) {
  const { params, update } = useUpdateParams();
  const current = params.get(param) ?? "";
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => update({ [param]: o.value || null })}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              on
                ? "border-ink bg-ink text-white"
                : "border-input text-foreground bg-background hover:bg-muted",
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span
                className={cn("font-mono text-[11px]", on ? "text-white/70" : "text-[#5a6672]")}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Date range filter as one pill with a small popover (e.g. "Príchod: všetky termíny"). */
export function DateRangePill({
  label,
  allLabel,
  fromLabel,
  toLabel,
  applyLabel,
  clearLabel,
}: {
  label: string;
  allLabel: string;
  fromLabel: string;
  toLabel: string;
  applyLabel: string;
  clearLabel: string;
}) {
  const { params, update } = useUpdateParams();
  const [open, setOpen] = useState(false);
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const [f, setF] = useState(from);
  const [tt, setT] = useState(to);
  const fmt = (v: string) => v.split("-").reverse().join(". ").replace(/^0/, "");
  const value = from || to ? `${from ? fmt(from) : "…"} – ${to ? fmt(to) : "…"}` : allLabel;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium",
          from || to ? "border-ink text-ink" : "border-input text-foreground",
        )}
      >
        <CalendarDays className="size-4" />
        {label}: {value}
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-72 gap-3">
        <label className="grid gap-1 text-sm">
          {fromLabel}
          <Input type="date" value={f} onChange={(e) => setF(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {toLabel}
          <Input type="date" value={tt} onChange={(e) => setT(e.target.value)} />
        </label>
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setF("");
              setT("");
              update({ from: null, to: null });
              setOpen(false);
            }}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            onClick={() => {
              update({ from: f || null, to: tt || null });
              setOpen(false);
            }}
          >
            {applyLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
