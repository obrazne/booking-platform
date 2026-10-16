"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PANEL_PARAM, panelValue } from "./panel-param";

const OPENED_IN_APP_KEY = "record-panel-opened";

function hrefWithPanel(pathname: string, params: URLSearchParams, panel: string | null): string {
  const next = new URLSearchParams(params);
  if (panel) next.set(PANEL_PARAM, panel);
  else next.delete(PANEL_PARAM);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Link that opens a record in the side panel, adding a history entry so Back closes it. */
export function PanelLink({
  type,
  id,
  ...props
}: { type: string; id: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  const params = useSearchParams();
  const value = panelValue(type, id);
  return (
    <Link
      {...props}
      href={hrefWithPanel(pathname, params, value)}
      scroll={false}
      onClick={(e) => {
        try {
          window.sessionStorage.setItem(OPENED_IN_APP_KEY, value);
        } catch {
          // ignore
        }
        props.onClick?.(e);
      }}
    />
  );
}

/**
 * Detail of a record sliding in from the right over part of the page; the list stays visible.
 * Open state lives in the URL: links can be shared, Back / Esc / click outside close it, full screen on mobile.
 */
export function RecordPanel({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(PANEL_PARAM);

  function close() {
    let openedInApp = false;
    try {
      openedInApp = window.sessionStorage.getItem(OPENED_IN_APP_KEY) === current;
      window.sessionStorage.removeItem(OPENED_IN_APP_KEY);
    } catch {
      // ignore
    }
    // Opened from the list → step back in history; opened from a shared link → just drop the parameter.
    if (openedInApp) router.back();
    else router.replace(hrefWithPanel(pathname, params, null), { scroll: false });
  }

  return (
    <Sheet open={current !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-lg md:max-w-xl">
        <SheetHeader className="border-border border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className={description ? undefined : "sr-only"}>
            {description ?? t("detail")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
