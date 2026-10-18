"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleUser } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activeAccountItem, type AccountNavItem } from "./account-nav-items";

/**
 * "Môj účet" in the header of the client's page and the account (Z59): a menu with the same items as the tabs of the
 * account (one source, `loadAccountNav`) and "Odhlásiť sa". Not signed in → a plain link to the login.
 */
export function AccountMenu({
  items,
  signOut,
}: {
  items: AccountNavItem[] | null;
  signOut: () => Promise<void>;
}) {
  const t = useTranslations("guest.account");
  const path = usePathname();
  if (!items)
    return (
      <Link
        href="/ucet"
        className="text-muted-foreground hover:text-foreground ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm"
      >
        <CircleUser className="size-4" /> {t("menu")}
      </Link>
    );
  const active = path.startsWith("/ucet") ? activeAccountItem(items, path) : null;
  const badge = items.reduce((sum, i) => sum + i.badge, 0);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menuOpen")}
        className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm"
      >
        <CircleUser className="size-4" /> {t("menu")}
        {badge ? (
          <span className="bg-accent-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold text-white">
            {badge}
          </span>
        ) : null}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {items.map((i) => (
          <DropdownMenuItem key={i.key} asChild>
            <Link
              href={i.href}
              aria-current={i.key === active ? "page" : undefined}
              className={i.key === active ? "font-bold" : undefined}
            >
              <span className="flex-1">{i.label}</span>
              {i.badge ? (
                <span
                  className="bg-accent-2 rounded-full px-[5px] text-[11px] font-bold text-white"
                  aria-label={t("tabs.badge", { count: i.badge })}
                >
                  {i.badge}
                </span>
              ) : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>{t("signOut")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
