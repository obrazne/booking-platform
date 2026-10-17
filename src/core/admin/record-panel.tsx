"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { PANEL_PARAM, panelValue, parsePanel } from "./panel-param";

const OPENED_IN_APP_KEY = "record-panel-opened";
/** Elements that switch the panel to another record instead of closing it (rows of the list, calendar bars). */
const SWITCHES_PANEL = "[data-panel-switch]";

function hrefWithPanel(pathname: string, params: URLSearchParams, panel: string | null): string {
  const next = new URLSearchParams(params);
  if (panel) next.set(PANEL_PARAM, panel);
  else next.delete(PANEL_PARAM);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** What a panel shows: built on the server (a Server Function returns it), rendered in the client panel. */
export type PanelContent = {
  header?: ReactNode;
  body: ReactNode;
  actions?: ReactNode;
  /** Accessible name of the panel. */
  label?: string;
};

type PanelLoader = (id: string) => Promise<PanelContent>;
// Panels that open instantly on the client (registered by UrlPanel) and their loaded content.
const loaders = new Map<string, PanelLoader>();
const contents = new Map<string, Promise<PanelContent>>();

function loadPanel(type: string, id: string, fresh = false): Promise<PanelContent> | null {
  const loader = loaders.get(type);
  if (!loader) return null;
  const key = panelValue(type, id);
  if (fresh) contents.delete(key);
  let p = contents.get(key);
  if (!p) {
    p = loader(id).catch((e) => {
      contents.delete(key);
      throw e;
    });
    contents.set(key, p);
  }
  return p;
}

/** Changes the URL without asking the server for the page again (Next keeps useSearchParams in sync). */
function setPanelInUrl(value: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(PANEL_PARAM, value);
  else url.searchParams.delete(PANEL_PARAM);
  const next = url.pathname + url.search + url.hash;
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

/**
 * Link that opens a record in the side panel, adding a history entry so Back closes it. While a panel is open,
 * clicking another such link switches the record (the panel stays); the selected row gets a soft accent background.
 * When the list has an instant panel (UrlPanel), the click only changes the URL — the list is not loaded again —
 * and hovering or focusing the row loads the detail ahead (Z26).
 */
export function PanelLink({
  type,
  id,
  className,
  ...props
}: { type: string; id: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  const params = useSearchParams();
  const value = panelValue(type, id);
  const current = params.get(PANEL_PARAM);
  const selected = current === value;
  const hoverTimer = useRef<number | null>(null);
  const prefetch = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    // A short delay: moving the mouse over the list does not load every row.
    hoverTimer.current = window.setTimeout(() => void loadPanel(type, id)?.catch(() => {}), 120);
  };
  return (
    <Link
      {...props}
      data-panel-switch=""
      aria-current={selected ? "true" : undefined}
      className={cn(selected && "bg-accent-soft", className)}
      // Switching records replaces the entry, so one Back still closes the panel.
      replace={current !== null}
      href={hrefWithPanel(pathname, params, value)}
      scroll={false}
      onMouseEnter={(e) => {
        prefetch();
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        props.onFocus?.(e);
      }}
      onClick={(e) => {
        try {
          if (current === null) window.sessionStorage.setItem(OPENED_IN_APP_KEY, "1");
        } catch {
          // ignore
        }
        props.onClick?.(e);
        const plain = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;
        if (plain && loaders.has(type)) {
          e.preventDefault();
          setPanelInUrl(value, current === null ? "push" : "replace");
        }
      }}
    />
  );
}

/**
 * Panel of a list that opens instantly (Z26): the URL (?panel=type:id) says what is open, the shell with a skeleton
 * appears right after the click and the detail comes from `load` (a Server Function — only the detail is loaded,
 * not the list or the counts). `version` changes with every server render of the page (after a change), which
 * loads the open detail again.
 */
export function UrlPanel({
  type,
  load,
  version,
  backLabel,
}: {
  type: string;
  load: PanelLoader;
  version: string;
  backLabel?: string;
}) {
  const t = useTranslations("common");
  const params = useSearchParams();
  const open = parsePanel(params.get(PANEL_PARAM) ?? undefined);
  const id = open?.type === type ? open.id : null;
  const [loaded, setLoaded] = useState<{ key: string; content: PanelContent | null }>({
    key: "",
    content: null,
  });
  const [failed, setFailed] = useState<string | null>(null);
  const seenVersion = useRef(version);

  useEffect(() => {
    loaders.set(type, load);
    return () => {
      loaders.delete(type);
    };
  }, [type, load]);

  useEffect(() => {
    // New server render (data changed): drop what was loaded before.
    const fresh = seenVersion.current !== version;
    if (fresh) {
      seenVersion.current = version;
      for (const k of contents.keys()) if (k.startsWith(`${type}:`)) contents.delete(k);
    }
    if (!id) return;
    const key = panelValue(type, id);
    let cancelled = false;
    loadPanel(type, id, fresh)
      ?.then((content) => {
        if (!cancelled) {
          setFailed(null);
          setLoaded({ key, content });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(key);
      });
    return () => {
      cancelled = true;
    };
  }, [type, id, version]);

  function close() {
    let openedInApp = false;
    try {
      openedInApp = window.sessionStorage.getItem(OPENED_IN_APP_KEY) === "1";
      window.sessionStorage.removeItem(OPENED_IN_APP_KEY);
    } catch {
      // ignore
    }
    if (openedInApp) window.history.back();
    else setPanelInUrl(null, "replace");
  }

  const key = id ? panelValue(type, id) : "";
  const content = loaded.key === key ? loaded.content : null;
  return (
    <SidePanel
      open={id !== null}
      onClose={close}
      header={content?.header ?? <span className="bg-muted h-5 w-40 animate-pulse rounded-full" />}
      label={content?.label}
      actions={content?.actions}
      backLabel={backLabel}
    >
      {content ? (
        content.body
      ) : failed === key ? (
        <p className="text-muted-foreground text-sm">{t("error")}</p>
      ) : (
        <PanelSkeleton />
      )}
    </SidePanel>
  );
}

/** Grey placeholder rows while the detail loads (the panel itself is already open). */
export function PanelSkeleton() {
  const t = useTranslations("common");
  return (
    <div className="grid gap-6" aria-busy="true" aria-label={t("loading")}>
      <div className="surface grid gap-4 p-5">
        <span className="bg-muted h-8 w-2/3 animate-pulse rounded-lg" />
        <span className="bg-muted h-4 w-1/2 animate-pulse rounded-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="bg-muted h-10 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-2">
          <span className="bg-muted h-3 w-24 animate-pulse rounded-full" />
          <span className="bg-muted h-16 animate-pulse rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Side panel with a record (A18, vizuál administrácie v1): 680 px on a computer, header with the number and state,
 * content in one column (`PanelSummary`, `PanelSection`, `PanelCollapsible`), action bar at the bottom. Full screen on a phone with
 * a "‹ back" bar and the actions stuck to the bottom. Closes with the cross, Esc, Back and a click beside it;
 * a click on another record (`data-panel-switch`) switches it instead. The page behind stays usable (not modal).
 */
export function SidePanel({
  open,
  onClose,
  header,
  title,
  backLabel,
  actions,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  /** Small header row: number (mono) and state pill. */
  header?: ReactNode;
  /** Big name under the header (28 px). */
  title?: ReactNode;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Accessible name of the panel when the title is not plain text. */
  label?: string;
}) {
  const t = useTranslations("common");
  return (
    <SheetPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest?.(SWITCHES_PANEL)) e.preventDefault();
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "bg-background text-foreground fixed inset-0 z-50 flex flex-col font-light outline-none md:inset-y-0 md:right-0 md:left-auto md:w-[680px] md:max-w-full",
            "border-line shadow-[-24px_0_60px_-30px_rgba(17,33,47,0.35)] md:border-l",
            "data-open:animate-in data-open:slide-in-from-right-10 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-right-10 data-closed:fade-out-0 duration-200",
          )}
        >
          <SheetPrimitive.Title className="sr-only">{label ?? t("detail")}</SheetPrimitive.Title>
          {/* Phone: back bar. */}
          <div className="border-line flex h-14 shrink-0 items-center gap-2 border-b px-2 md:hidden">
            <button
              type="button"
              onClick={onClose}
              className="text-ink inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] font-medium"
            >
              <ChevronLeft className="size-5" /> {backLabel ?? t("back")}
            </button>
            <span className="ml-auto flex items-center gap-2 pr-2">{header}</span>
          </div>
          {/* Computer: number and state + close. */}
          <div className="border-line hidden h-16 shrink-0 items-center justify-between gap-3 border-b px-7 md:flex">
            <span className="flex min-w-0 items-center gap-2.5">{header}</span>
            <SheetPrimitive.Close
              aria-label={t("close")}
              className="text-ink hover:bg-muted inline-flex size-10 items-center justify-center rounded-full"
            >
              <X className="size-5" />
            </SheetPrimitive.Close>
          </div>
          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 md:px-7 [&>*]:min-w-0">
            {title ? (
              <div className="text-ink mb-6 text-[28px] leading-tight font-extrabold tracking-tight">
                {title}
              </div>
            ) : null}
            {children}
          </div>
          {actions ? (
            <div className="border-line bg-background flex shrink-0 flex-wrap items-center gap-2.5 border-t px-5 py-3.5 md:px-7">
              {actions}
            </div>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}

/**
 * Summary card at the top of the panel (v1.1, rule 1): name 28 px, contact line, key facts in a grid of 2–4
 * (e.g. Príchod · Odchod · Noci · Hostia · Suma) on the soft surface. Long values wrap, nothing overlaps.
 */
export function PanelSummary({
  title,
  subtitle,
  facts = [],
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  facts?: { label: ReactNode; value: ReactNode }[];
  children?: ReactNode;
}) {
  return (
    <div className="surface grid min-w-0 gap-4 p-5">
      <div className="grid min-w-0 gap-1">
        <div className="text-ink text-[28px] leading-tight font-extrabold tracking-tight [overflow-wrap:anywhere]">
          {title}
        </div>
        {subtitle ? (
          <div className="text-muted-foreground text-sm font-normal [overflow-wrap:anywhere]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {facts.length ? (
        <dl className="border-hair grid grid-cols-2 gap-x-5 gap-y-3 border-t pt-4 sm:grid-cols-4">
          {facts.map((f, i) => (
            <div key={i} className="grid min-w-0 content-start gap-0.5">
              <dt className="label-mono">{f.label}</dt>
              <dd className="text-ink text-[15px] font-bold [overflow-wrap:anywhere]">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </div>
  );
}

/** Secondary section folded as a row with a count (História (3), Súhlasy (4), Posledné zmeny). */
export function PanelCollapsible({
  label,
  count,
  children,
}: {
  label: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="border-hair border-t">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center gap-2 text-left"
      >
        <span className="label-mono">{label}</span>
        {count !== undefined ? (
          <span className="text-muted-foreground font-mono text-[11px]">({count})</span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted-foreground ml-auto size-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={id} hidden={!open} className="pb-4">
        {open ? children : null}
      </div>
    </section>
  );
}

/** Section of a panel or card with the mono label (rule 3). */
export function PanelSection({
  label,
  aside,
  children,
}: {
  label: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2 [&>*]:min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-mono">{label}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Record panel whose open state lives in the URL (`?panel=type:id`): links can be shared, Back closes it.
 */
export function RecordPanel({
  title,
  description,
  header,
  actions,
  backLabel,
  label,
  children,
}: {
  title?: ReactNode;
  /** Accessible name when the title is not plain text (or the summary card shows the name). */
  label?: string;
  /** Short line under the title (e.g. a hint). */
  description?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  backLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(PANEL_PARAM);

  function close() {
    let openedInApp = false;
    try {
      openedInApp = window.sessionStorage.getItem(OPENED_IN_APP_KEY) === "1";
      window.sessionStorage.removeItem(OPENED_IN_APP_KEY);
    } catch {
      // ignore
    }
    // Opened from the list → step back in history; opened from a shared link → just drop the parameter.
    if (openedInApp) router.back();
    else router.replace(hrefWithPanel(pathname, params, null), { scroll: false });
  }

  return (
    <SidePanel
      open={current !== null}
      onClose={close}
      header={header}
      title={
        description ? (
          <>
            {title}
            <p className="text-muted-foreground mt-1 text-sm font-light tracking-normal">
              {description}
            </p>
          </>
        ) : (
          title
        )
      }
      label={label ?? (typeof title === "string" ? title : undefined)}
      actions={actions}
      backLabel={backLabel}
    >
      {children}
    </SidePanel>
  );
}
