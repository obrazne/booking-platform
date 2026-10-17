"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Menu, Pin, PinOff, Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Group in the menu: main items, "Obsadenosť" (occupancy) or the bottom block (team, settings, control center). */
  group?: "main" | "occupancy" | "bottom";
  /** Small warm counter (e.g. reservations waiting for payment). */
  badge?: number;
};

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

const ExpandedContext = createContext(true);

/** Whether the side menu is expanded (picker and user block hide their texts in the icon rail). */
export function useShellExpanded(): boolean {
  return useContext(ExpandedContext);
}

function isActive(pathname: string, href: string, roots: string[]): boolean {
  return roots.includes(href)
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  expanded,
  active,
  onNavigate,
}: {
  item: ShellNavItem;
  expanded: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={expanded ? undefined : item.label}
      className={cn(
        "nav-link relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
        "text-sidebar-foreground hover:bg-[#efeee9] dark:hover:bg-white/5",
        active && "bg-sidebar-accent text-sidebar-accent-foreground font-bold",
      )}
    >
      <span className="flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-[18px] [&_svg]:stroke-[1.6]">
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
      {item.badge ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-[#f6ecdf] font-bold text-[#8a4a22]",
            expanded
              ? "ml-auto h-5 min-w-5 px-1.5 text-[11px]"
              : "absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[10px]",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroups({
  items,
  expanded,
  roots,
  onNavigate,
}: {
  items: ShellNavItem[];
  expanded: boolean;
  roots: string[];
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const link = (item: ShellNavItem) => (
    <NavLink
      key={item.href}
      item={item}
      expanded={expanded}
      active={isActive(pathname, item.href, roots)}
      onNavigate={onNavigate}
    />
  );
  const main = items.filter((i) => (i.group ?? "main") === "main");
  const occupancy = items.filter((i) => i.group === "occupancy");
  const bottom = items.filter((i) => i.group === "bottom");
  return (
    <nav
      aria-label={t("mainMenu")}
      className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-[18px] overflow-x-hidden overflow-y-auto"
    >
      <div className="grid gap-0.5">{main.map(link)}</div>
      {occupancy.length ? (
        <div className="grid gap-0.5">
          <span
            className={cn(
              "label-mono truncate px-3 pb-1.5 transition-opacity",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            {t("occupancy")}
          </span>
          {occupancy.map(link)}
        </div>
      ) : null}
      {bottom.length ? (
        <div className="border-sidebar-border mt-auto grid gap-0.5 border-t pt-3.5">
          {bottom.map(link)}
        </div>
      ) : null}
    </nav>
  );
}

function BrandMark({ icon }: { icon: ReactNode }) {
  return (
    <span className="bg-primary text-primary-foreground flex size-[30px] shrink-0 items-center justify-center rounded-lg [&_svg]:size-4">
      {icon}
    </span>
  );
}

/**
 * Admin layout (A18, vizuál administrácie v1): side menu with the accommodation picker on top, main items,
 * "Obsadenosť", and team / settings / control center with the user at the bottom. On a computer it collapses to an
 * icon rail that expands on hover and can be pinned; on a phone a 56 px top bar with the menu from the side and +.
 */
export function AdminShell({
  brand,
  picker,
  items,
  user,
  mobileTitle,
  addHref,
  addLabel,
  roots = ["/admin", "/platform"],
  variant = "admin",
  tag,
  banner,
  children,
}: {
  brand: { icon: ReactNode; label: string };
  /** "control" = the control center: graphite menu, so it is always clear where you are (v1.1). */
  variant?: "admin" | "control";
  /** Small line under the name ("Riadiace centrum · vidíš len ty"). */
  tag?: string;
  /** Bar above the content ("Prezeráš ako správca: …"). */
  banner?: ReactNode;
  /** Accommodation picker (none in the control center); reads `useShellExpanded()`. */
  picker?: ReactNode;
  items: ShellNavItem[];
  /** User block at the bottom; reads `useShellExpanded()`. */
  user: ReactNode;
  mobileTitle: string;
  /** "+" in the phone top bar (manual reservation). */
  addHref?: string;
  addLabel?: string;
  /** Items that are active only on their exact path. */
  roots?: string[];
  children: ReactNode;
}) {
  const t = useTranslations("shell");
  const pinned = useSyncExternalStore(subscribePinned, readPinned, () => false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = pinned || hovered;

  return (
    <div data-admin-ui className="bg-background text-foreground flex min-h-svh font-light">
      {/* Desktop rail: 64 px, or 248 px when pinned; hover expands it over the content. */}
      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 md:block",
          pinned ? "w-62" : "w-[68px]",
        )}
      >
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          // Keyboard: focus inside the rail expands it like hovering does.
          onFocus={() => setHovered(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
          }}
          className={cn(
            "bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 flex flex-col gap-[18px] overflow-hidden border-r px-3.5 py-[18px]",
            variant === "control" && "shell-control",
            "transition-[width,box-shadow] duration-200 ease-out",
            expanded ? "w-62" : "w-[68px]",
            hovered && !pinned && "shadow-xl",
          )}
        >
          <div className="flex items-center gap-2.5 px-[5px] py-1">
            <BrandMark icon={brand.icon} />
            <span
              className={cn(
                "grid min-w-0 transition-opacity duration-200",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="text-ink truncate text-[15px] font-extrabold tracking-tight">
                {brand.label}
              </span>
              {tag ? <span className="label-mono truncate">{tag}</span> : null}
            </span>
            <button
              type="button"
              onClick={() => writePinned(!pinned)}
              aria-label={pinned ? t("unpin") : t("pin")}
              title={pinned ? t("unpin") : t("pin")}
              className={cn(
                "text-muted-foreground hover:text-ink ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity [&_svg]:size-4",
                expanded ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {pinned ? <PinOff /> : <Pin />}
            </button>
          </div>
          <ExpandedContext.Provider value={expanded}>
            {picker}
            <NavGroups items={items} expanded={expanded} roots={roots} />
            {user}
          </ExpandedContext.Provider>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {banner}
        {/* Phone top bar (06): menu, accommodation, + manual reservation. */}
        <header className="bg-background border-line sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t("menu")}
            className="text-ink inline-flex size-11 items-center justify-center rounded-full"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-ink min-w-0 flex-1 truncate text-[15px] font-bold">
            {mobileTitle}
          </span>
          {addHref ? (
            <Link
              href={addHref}
              aria-label={addLabel}
              title={addLabel}
              className="bg-primary text-primary-foreground inline-flex size-11 items-center justify-center rounded-full"
            >
              <Plus className="size-5" />
            </Link>
          ) : null}
        </header>
        {/* Default page padding; redesigned pages with their own header mark their root with data-bleed. */}
        <main className="min-w-0 flex-1 p-5 has-[>[data-bleed]]:p-0 md:px-10 md:py-8">
          {children}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn(
            "bg-sidebar flex flex-col gap-[18px] rounded-none p-3.5 data-[side=left]:w-[316px] data-[side=left]:max-w-[90vw] data-[side=left]:sm:max-w-[316px]",
            variant === "control" && "shell-control",
          )}
        >
          <div className="flex items-center gap-2.5 px-1 py-1">
            <BrandMark icon={brand.icon} />
            <SheetTitle className="text-ink truncate text-[15px] font-extrabold">
              {brand.label}
            </SheetTitle>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
              className="text-ink ml-auto inline-flex size-11 items-center justify-center rounded-full"
            >
              <X className="size-5" />
            </button>
          </div>
          {picker}
          <NavGroups items={items} expanded roots={roots} onNavigate={() => setMobileOpen(false)} />
          {/* "Čo je nové" opens its own window — the menu closes first. */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-closes-menu]")) setMobileOpen(false);
            }}
          >
            {user}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
