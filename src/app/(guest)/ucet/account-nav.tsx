"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { activeAccountItem, type AccountNavItem } from "@/core/guest/account-nav-items";
import { cn } from "@/lib/utils";

/**
 * Tabs of the guest account (v2.4, Z59): Aktuálny pobyt · Pobyty (badge with things to do) · Moje údaje — the same items
 * as the "Môj účet" menu of the header (`loadAccountNav`), "Odhlásiť sa" on the right; sticky under the client's
 * header. Phones: pills. Not on the login page.
 */
export function AccountTabs({
  items,
  signOut,
}: {
  items: AccountNavItem[];
  signOut: () => Promise<void>;
}) {
  const t = useTranslations("guest.account");
  const path = usePathname();
  // Not on the login, nor on the conversation's own screen (phones, Z47 — it has its own top bar).
  if (path.startsWith("/ucet/prihlasenie") || path.endsWith("/spravy")) return null;
  const active = activeAccountItem(items, path);
  const tabs = items.map((i) => ({ ...i, on: i.key === active }));
  return (
    <div
      data-sticky-bar
      className="border-line sticky top-0 z-20 border-b bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <nav aria-label={t("menu")} className="flex gap-1.5 overflow-x-auto py-2 sm:py-0">
          {tabs.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              aria-current={x.on ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center text-[15px] whitespace-nowrap",
                // Phones: pills; computers: tabs with the accent underline.
                "min-h-10 rounded-full border px-3 text-[14px] sm:min-h-[52px] sm:rounded-none sm:border-0 sm:border-b-2 sm:px-3.5 sm:text-[15px]",
                x.on
                  ? "border-ink bg-ink sm:border-primary sm:text-ink font-bold text-white sm:bg-transparent"
                  : "border-line font-medium text-[#5a6672] sm:border-transparent",
              )}
            >
              {x.label}
              {x.badge ? (
                <span
                  className="bg-accent-2 ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold text-white"
                  aria-label={t("tabs.badge", { count: x.badge })}
                >
                  {x.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        {/* Phones: "Odhlásiť sa" is in the "Môj účet" menu of the header — the three tabs need the width (Z59). */}
        <form action={signOut} className="hidden shrink-0 sm:block">
          <button type="submit" className="min-h-11 text-sm text-[#5a6672] hover:text-[#11212f]">
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Breadcrumbs of the account (v2.4): "Pobyty › 22. – 26. 12. 2026 › Check-in"; on phones only "‹ Pobyty" (or the parent). */
export function AccountCrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const t = useTranslations("guest.account");
  const parent = [...items].reverse().find((x) => x.href);
  return (
    <nav aria-label={t("crumbs")} className="text-sm">
      {parent ? (
        <Link
          href={parent.href!}
          className="inline-flex items-center gap-1 text-[#5a6672] hover:text-[#11212f] sm:hidden"
        >
          <ChevronLeft className="size-4" /> {parent.label}
        </Link>
      ) : null}
      <ol className="hidden flex-wrap items-center gap-2 sm:flex">
        {items.map((x, i) => (
          <li key={i} className="inline-flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden className="text-[#a9aeb5]">
                ›
              </span>
            ) : null}
            {x.href ? (
              <Link
                href={x.href}
                className="text-[#5a6672] underline underline-offset-[3px] hover:text-[#11212f]"
              >
                {x.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink font-medium">
                {x.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
