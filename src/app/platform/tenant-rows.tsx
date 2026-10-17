"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadTenantRow } from "./row-loader";

export type TenantRowData = {
  id: string;
  name: string;
  color: string;
  owner: string | null;
  domain: string | null;
  modules: string;
  reservations30: number;
  status: "onboarding" | "active" | "suspended";
};

const STATUS_PILL = {
  onboarding: "bg-[#f6ecdf] text-[#8a4a22]",
  active: "bg-primary text-primary-foreground",
  suspended: "bg-[#eef0f3] text-[#3b4652]",
};

const GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_100px_130px_36px] items-center gap-4";

/**
 * Client list of the control center as expandable rows (v1.2, rule 7) instead of a side panel: one open at a time,
 * the detail loads when the row opens and is fetched ahead on hover or focus (Z26).
 */
export function TenantRows({ rows }: { rows: TenantRowData[] }) {
  const t = useTranslations("adminV1.platform");
  const tp = useTranslations("platform");
  const tc = useTranslations("common");
  const [open, setOpen] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, ReactNode>>({});
  const pending = useRef(new Map<string, Promise<ReactNode>>());

  const fetchRow = (r: TenantRowData) => {
    if (!pending.current.has(r.id)) {
      const p = loadTenantRow(r.id, r.domain).then((node) => {
        setContent((c) => ({ ...c, [r.id]: node }));
        return node;
      });
      pending.current.set(r.id, p);
    }
    return pending.current.get(r.id)!;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[820px]">
        <div aria-hidden className={cn(GRID, "border-line label-mono border-b px-2 py-3")}>
          <span>{t("client")}</span>
          <span>{t("address")}</span>
          <span>{t("package")}</span>
          <span className="text-right">{t("res30")}</span>
          <span>{tp("status")}</span>
          <span />
        </div>
        <ul aria-label={tp("tenants")}>
          {rows.map((r) => {
            const isOpen = open === r.id;
            const regionId = `tenant-${r.id}`;
            return (
              <li key={r.id} className="border-line border-b">
                <div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={regionId}
                    onPointerEnter={() => void fetchRow(r)}
                    onFocus={() => void fetchRow(r)}
                    onClick={() => {
                      void fetchRow(r);
                      setOpen(isOpen ? null : r.id);
                    }}
                    className={cn(
                      GRID,
                      "w-full px-2 py-4 text-left transition-colors hover:bg-[#fbfaf7]",
                      isOpen && "bg-[#fbfaf7]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-7 shrink-0 rounded-lg"
                        style={{ background: r.color }}
                      />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-ink truncate text-[15px] font-bold">{r.name}</span>
                        <span className="truncate text-[13px] text-[#5a6672]">
                          {r.owner ?? t("noOwner")}
                        </span>
                      </span>
                    </span>
                    <span className="text-ink truncate font-mono text-[13px]">
                      {r.domain ?? "—"}
                    </span>
                    <span className="truncate text-[13px] text-[#5a6672]">{r.modules}</span>
                    <span className="text-ink text-right text-[15px] font-bold tabular-nums">
                      {r.reservations30}
                    </span>
                    <span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                          STATUS_PILL[r.status],
                        )}
                      >
                        {tp(`statuses.${r.status}`)}
                      </span>
                    </span>
                    <span className="text-muted-foreground justify-self-end">
                      <ChevronDown
                        className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                      />
                    </span>
                  </button>
                </div>
                <div
                  id={regionId}
                  role="region"
                  aria-label={r.name}
                  hidden={!isOpen}
                  className="px-2 pt-2 pb-6"
                >
                  {isOpen
                    ? (content[r.id] ?? (
                        <p className="text-muted-foreground text-sm" role="status">
                          {tc("loading")}
                        </p>
                      ))
                    : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
