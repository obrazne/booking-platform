"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const TAB_PARAM = "tab";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener("panel-tab", cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener("panel-tab", cb);
  };
}

/** Opens a tab of the panel: the URL keeps it (`?tab=…`), without loading the page again. */
function selectTab(key: string, first: string) {
  const url = new URL(window.location.href);
  if (key === first) url.searchParams.delete(TAB_PARAM);
  else url.searchParams.set(TAB_PARAM, key);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  window.dispatchEvent(new Event("panel-tab"));
}

/**
 * Tabs of a record panel (Z46, design v1.3): "Prehľad" and what modules add (Správy with the number of unread).
 * Only the open tab is mounted — a tab that marks something read does it when it is shown.
 */
export function PanelTabs({
  tabs,
}: {
  tabs: { key: string; label: string; count?: number; content: ReactNode }[];
}) {
  const id = useId();
  const first = tabs[0]?.key ?? "";
  const wanted = useSyncExternalStore(
    subscribe,
    () => new URL(window.location.href).searchParams.get(TAB_PARAM),
    () => null,
  );
  const active = tabs.some((t) => t.key === wanted) ? wanted! : first;
  return (
    <div className="grid min-w-0 gap-6">
      <div role="tablist" className="border-line -mt-2 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${id}-${t.key}`}
              aria-selected={on}
              aria-controls={`${id}-${t.key}-panel`}
              onClick={() => selectTab(t.key, first)}
              className={cn(
                "-mb-px inline-flex h-[42px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm",
                on
                  ? "border-primary text-ink font-bold"
                  : "border-transparent font-medium text-[#5a6672] hover:text-[#11212f]",
              )}
            >
              {t.label}
              {t.count ? (
                <span className="rounded-full bg-[#c2552d] px-1.5 py-px text-[11px] font-bold text-white">
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {tabs.map((t) =>
        t.key === active ? (
          <div
            key={t.key}
            role="tabpanel"
            id={`${id}-${t.key}-panel`}
            aria-labelledby={`${id}-${t.key}`}
            className="grid min-w-0 gap-6"
          >
            {t.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
