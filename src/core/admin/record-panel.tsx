"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { PANEL_PARAM, panelValue } from "./panel-param";

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

/**
 * Link that opens a record in the side panel, adding a history entry so Back closes it. While a panel is open,
 * clicking another such link switches the record (the panel stays); the selected row gets a soft accent background.
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
      onClick={(e) => {
        try {
          if (current === null) window.sessionStorage.setItem(OPENED_IN_APP_KEY, "1");
        } catch {
          // ignore
        }
        props.onClick?.(e);
      }}
    />
  );
}

/**
 * Side panel with a record (A18, vizuál administrácie v1): 680 px on a computer, header with the number and state,
 * content (two columns from 1024 px — use `PanelColumns`), action bar at the bottom. Full screen on a phone with
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
          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7">
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

/** Two columns of the panel content (left: dates, payment, breakdown; right: notes, documents, history). */
export function PanelColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <div className="grid min-w-0 gap-6">{left}</div>
      <div className="grid min-w-0 gap-6">{right}</div>
    </div>
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
    <section className="grid gap-2">
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
  children,
}: {
  title: ReactNode;
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
      label={typeof title === "string" ? title : undefined}
      actions={actions}
      backLabel={backLabel}
    >
      {children}
    </SidePanel>
  );
}
