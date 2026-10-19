"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleHelp, FileText, Hash, Search, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchClients, searchRecords, type RecordHit } from "./actions";
import { matches } from "./registry";

export type SearchRow = { id: string; title: string; where: string; terms: string; href: string };
type Group = { key: "pages" | "help" | "clients" | "records"; rows: RecordHit[] };

const RECENT_MAX = 5;

function readRecent(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function best(rows: readonly SearchRow[], q: string, limit: number): RecordHit[] {
  return rows
    .map((r) => ({
      r,
      // The title counts more than the words around it.
      score: matches(r.title, q) * 3 + matches(`${r.title} ${r.where} ${r.terms}`, q),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r }) => ({ id: r.id, title: r.title, where: r.where, href: r.href }));
}

/**
 * Search of the top bar (Z67, vizuál administrácie v1.5, doska 15): Ctrl K / Cmd K, examples and the last searches
 * in an empty field, results in groups Nastavenia a stránky · Pomoc · Rezervácie a hostia (control center: Klienti);
 * arrows, Enter, Esc. Pages and help are searched here at once; records in the database (a short pause after typing).
 * On a phone a magnifier opens the search over the whole screen.
 */
export function SearchBox({
  variant,
  scope,
  pages,
  help = [],
  helpHref,
}: {
  /** The field of the top bar (computer) or the magnifier of the phone bar. */
  variant: "desktop" | "mobile";
  scope: "admin" | "platform";
  pages: readonly SearchRow[];
  help?: readonly SearchRow[];
  /** "Nenašli ste? Napíšte nám" — the form in Pomoc. */
  helpHref?: string;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const recentKey = `search_recent_${scope}`;
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(0);
  const [records, setRecords] = useState<{ q: string; rows: RecordHit[] }>({ q: "", rows: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const query = q.trim();

  // Ctrl K / Cmd K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        const wide = window.matchMedia("(min-width: 768px)").matches;
        if (wide !== (variant === "desktop")) return;
        e.preventDefault();
        if (wide) desktopRef.current?.focus();
        else setMobile(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  useEffect(() => {
    if (mobile) mobileRef.current?.focus();
  }, [mobile]);

  // Records from the database a moment after typing; an older answer never overwrites a newer query.
  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const rows = await (scope === "platform" ? searchClients(query) : searchRecords(query));
        setRecords({ q: query, rows });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, scope]);

  // Click outside closes the desktop list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const groups: Group[] = useMemo(() => {
    if (query.length < 2) return [];
    const list: Group[] = [
      { key: "pages", rows: best(pages, query, 5) },
      { key: "help", rows: best(help, query, 4) },
      {
        key: scope === "platform" ? "clients" : "records",
        rows: records.q === query ? records.rows : [],
      },
    ];
    return list.filter((g) => g.rows.length);
  }, [query, pages, help, records, scope]);
  const flat = groups.flatMap((g) => g.rows);
  const shown = open || mobile;

  function remember(text: string) {
    const next = [text, ...recent.filter((x) => x !== text)].slice(0, RECENT_MAX);
    setRecent(next);
    try {
      localStorage.setItem(recentKey, JSON.stringify(next));
    } catch {
      /* private window — the search works without it */
    }
  }

  function go(hit: RecordHit) {
    if (query) remember(query);
    setOpen(false);
    setMobile(false);
    setQ("");
    desktopRef.current?.blur();
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setMobile(false);
      e.currentTarget.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      const hit = flat[active];
      if (hit) {
        e.preventDefault();
        go(hit);
      }
    }
  }

  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const input = (ref: React.RefObject<HTMLInputElement | null>, big: boolean) => (
    <label
      className={cn(
        "field-box text-muted-foreground flex items-center gap-2.5 rounded-full px-3.5",
        big ? "min-h-12 text-base" : "min-h-[42px] text-sm",
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <input
        ref={ref}
        type="search"
        role="combobox"
        aria-label={t("label")}
        aria-expanded={shown && (query.length >= 2 || recent.length > 0)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={flat.length ? optionId(active) : undefined}
        placeholder={scope === "platform" ? t("placeholderPlatform") : t("placeholder")}
        data-field="bare"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setRecent(readRecent(recentKey));
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="text-ink min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {big ? null : (
        <kbd className="hidden rounded-md border border-[#c9c5ba] px-1.5 py-0.5 font-mono text-[11px] text-[#5a6672] lg:inline">
          Ctrl K
        </kbd>
      )}
    </label>
  );

  const ICON = { pages: Settings2, help: CircleHelp, records: Hash, clients: FileText };
  let index = -1;
  const panel = (
    <div id={listId} role="listbox" aria-label={t("results")} className="grid">
      {query.length < 2 ? (
        <div className="grid gap-3 px-5 py-4 text-sm">
          {recent.length ? (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="label-mono">{t("recent")}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    try {
                      localStorage.removeItem(recentKey);
                    } catch {
                      /* nothing to clear */
                    }
                  }}
                  className="text-xs text-[#5a6672] hover:underline"
                >
                  {t("clearRecent")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQ(r)}
                    className="text-ink rounded-full border border-[#dcd8ce] bg-white px-3 py-1 text-[13px] hover:bg-[#f4f3ef]"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {scope === "admin" ? (
            <div className="grid gap-1.5">
              <span className="label-mono">{t("examples")}</span>
              <div className="flex flex-wrap gap-2">
                {t("examplesList")
                  .split("|")
                  .map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setQ(x)}
                      className="text-ink rounded-full border border-[#dcd8ce] bg-white px-3 py-1 text-[13px] hover:bg-[#f4f3ef]"
                    >
                      {x}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : groups.length === 0 ? (
        <p className="px-5 py-4 text-sm text-[#5a6672]" role="status">
          {pending ? t("searching") : t("nothing", { q: query })}
        </p>
      ) : (
        groups.map((g) => {
          const Icon = ICON[g.key];
          return (
            <div key={g.key} role="group" aria-label={t(`groups.${g.key}`)} className="grid py-2.5">
              <span
                className={cn(
                  "px-5 pt-1 pb-1.5 font-mono text-[11px] font-medium tracking-[0.14em] uppercase",
                  g.key === "pages"
                    ? "text-[#2f5d50]"
                    : g.key === "help"
                      ? "text-[#ad5a2b]"
                      : "text-[#5a6672]",
                )}
              >
                {t(`groups.${g.key}`)}
              </span>
              {g.rows.map((hit) => {
                index += 1;
                const i = index;
                return (
                  <Link
                    key={hit.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    href={hit.href}
                    onClick={(e) => {
                      e.preventDefault();
                      go(hit);
                    }}
                    onMouseMove={() => setActive(i)}
                    className={cn(
                      "flex items-center gap-3.5 px-5 py-2.5 transition-colors",
                      i === active ? "bg-[#f1f5f3]" : "bg-white",
                    )}
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f3ef] text-[#3b3d42]">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-ink truncate text-[14.5px] font-medium">
                        {hit.title}
                      </span>
                      <span className="truncate text-[13px] text-[#5a6672]">{hit.where}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[13px] text-[#5a6672]">
                      {g.key === "help" ? t("read") : t("go")}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebe6] bg-[#fafaf8] px-5 py-3.5 text-[13px] text-[#5a6672]">
        <span className="hidden md:inline">{t("keys")}</span>
        {helpHref ? (
          <Link
            href={`${helpHref}?from=${encodeURIComponent(pathname)}#napiste`}
            onClick={() => {
              setOpen(false);
              setMobile(false);
            }}
            className="text-ink font-medium hover:underline"
          >
            {t("notFound")}
          </Link>
        ) : null}
      </div>
    </div>
  );

  if (variant === "desktop")
    return (
      <div ref={boxRef} className="relative flex-[0_1_560px]">
        {input(desktopRef, false)}
        {open ? (
          <div className="absolute top-[calc(100%+10px)] left-0 z-50 w-[min(620px,calc(100vw-340px))] divide-y divide-[#ecebe6] overflow-hidden rounded-[14px] border border-[#c9c5ba] bg-white shadow-[0_28px_70px_-28px_rgba(17,33,47,0.45)]">
            {panel}
          </div>
        ) : null}
      </div>
    );
  return (
    <>
      {/* Phone: the magnifier in the top bar opens the search over the whole screen. */}
      <button
        type="button"
        onClick={() => setMobile(true)}
        aria-label={t("open")}
        className="text-ink inline-flex size-11 items-center justify-center rounded-full md:hidden"
      >
        <Search className="size-5" />
      </button>
      {mobile ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("label")}
          className="bg-background fixed inset-0 z-50 flex flex-col md:hidden"
        >
          <div className="border-line flex items-center gap-2 border-b px-3 py-2.5">
            <div className="min-w-0 flex-1">{input(mobileRef, true)}</div>
            <button
              type="button"
              onClick={() => setMobile(false)}
              aria-label={t("close")}
              className="text-ink inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
        </div>
      ) : null}
    </>
  );
}
