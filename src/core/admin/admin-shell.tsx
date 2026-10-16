"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Menu, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellNavItem = { href: string; label: string; icon: ReactNode };

const PIN_STORAGE_KEY = "admin-sidebar-pinned";
const pinListeners = new Set<() => void>();

function readPinned(): boolean {
  try {
    return window.localStorage.getItem(PIN_STORAGE_KEY) === "1";
  } catch {
    return false; // storage unavailable (private mode)
  }
}

function writePinned(value: boolean) {
  try {
    window.localStorage.setItem(PIN_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
  pinListeners.forEach((l) => l());
}

function subscribePinned(listener: () => void) {
  pinListeners.add(listener);
  return () => pinListeners.delete(listener);
}

function isActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  items,
  expanded,
  onNavigate,
}: {
  items: ShellNavItem[];
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={expanded ? undefined : item.label}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors duration-200",
              "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
            )}
          >
            <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
              {item.icon}
            </span>
            <span
              className={cn(
                "truncate transition-opacity duration-200",
                expanded ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Admin layout (A18): collapsible icon rail that expands on hover and can be pinned (desktop),
 * slide-in menu on mobile. Navigation items come from the core and from enabled modules.
 */
export function AdminShell({
  brand,
  items,
  topbar,
  children,
}: {
  brand: ReactNode;
  items: ShellNavItem[];
  topbar: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("shell");
  const pinned = useSyncExternalStore(subscribePinned, readPinned, () => false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = pinned || hovered;

  function togglePin() {
    writePinned(!pinned);
  }

  return (
    <div className="bg-background flex min-h-svh">
      {/* Desktop rail: occupies 56px (or 232px when pinned); hover expands it over the content. */}
      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-300 md:block",
          pinned ? "w-58" : "w-14",
        )}
      >
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            "bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 flex flex-col border-r",
            "transition-[width,box-shadow] duration-300 ease-out",
            expanded ? "w-58" : "w-14",
            hovered && !pinned && "shadow-xl",
          )}
        >
          <div className="flex h-14 items-center overflow-hidden px-3.5">{brand}</div>
          <div className="flex-1 overflow-x-hidden overflow-y-auto px-2">
            <NavList items={items} expanded={expanded} />
          </div>
          <div className="px-2 pb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePin}
              aria-label={pinned ? t("unpin") : t("pin")}
              title={pinned ? t("unpin") : t("pin")}
            >
              {pinned ? <PinOff /> : <Pin />}
            </Button>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 border-border sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t("menu")}
          >
            <Menu />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">{topbar}</div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar w-72 p-3">
          <SheetHeader className="px-1">
            <SheetTitle>{brand}</SheetTitle>
          </SheetHeader>
          <NavList items={items} expanded onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
