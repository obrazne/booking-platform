"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
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
export function SortHeader({ column, children }: { column: string; children: ReactNode }) {
  const { params, update } = useUpdateParams();
  const active = params.get("sort") === column;
  const dir = active ? params.get("dir") : null;
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

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
      <span>{t("results", { count: total })}</span>
      <div className="flex items-center gap-2">
        <span>{t("pageOf", { page, pages })}</span>
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link
            href={href(page - 1)}
            aria-disabled={page <= 1}
            className={cn(page <= 1 && "pointer-events-none opacity-50")}
          >
            {t("previous")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={href(page + 1)}
            aria-disabled={page >= pages}
            className={cn(page >= pages && "pointer-events-none opacity-50")}
          >
            {t("next")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
