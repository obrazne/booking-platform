"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Menu, Pin, PinOff, Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  /** Link target; a group (with `children`) has none — it only opens and closes. */
  href?: string;
  label: string;
  /** Icon of a main item; sub-items are indented text only. */
  icon?: ReactNode;
  /** Main block, or the bottom block (settings, control center). */
  section?: "main" | "bottom";
  /** Sub-items of a group (v1.2: Rezervácie › Zoznam, Kalendár, Blokácie …). */
  children?: ShellNavItem[];
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

function isActive(pathname: string, href: string | undefined, roots: string[]): boolean {
  if (!href) return false;
  const path = href.split(/[?#]/)[0]!;
  return roots.includes(path)
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

/** The most specific item matching the path (so /admin/properties/x/photos marks Fotky, not Údaje). */
function activeHref(items: ShellNavItem[], pathname: string, roots: string[]): string | null {
  let best: string | null = null;
  const length = (href: string) => href.split(/[?#]/)[0]!.length;
  const walk = (list: ShellNavItem[]) => {
    for (const item of list) {
      if (item.children) walk(item.children);
      else if (item.href && isActive(pathname, item.href, roots)) {
        if (!best || length(item.href) > length(best)) best = item.href;
      }
    }
  };
  walk(items);
  return best;
}

function Badge({ value, expanded }: { value?: number; expanded: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#f6ecdf] font-bold text-[#8a4a22]",
        expanded
          ? "ml-auto h-5 min-w-5 px-1.5 text-[11px]"
          : "absolute top-0.5 right-2 h-4 min-w-4 px-1 text-[10px]",
      )}
    >
      {value}
    </span>
  );
}

const ROW =
  "nav-link relative flex w-full items-center gap-3 text-left transition-colors duration-150 hover:bg-[var(--nav-hover)]";
const ICON =
  "flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-[18px] [&_svg]:stroke-[1.6]";

function NavLink({
  item,
  expanded,
  active,
  sub = false,
  onNavigate,
}: {
  item: ShellNavItem;
  expanded: boolean;
  active: boolean;
  sub?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={expanded ? undefined : item.label}
      className={cn(
        ROW,
        "text-sidebar-foreground",
        sub ? "min-h-[34px] pr-5 pl-[50px] text-[13.5px]" : "min-h-10 px-5 text-sm font-medium",
        active &&
          "bg-[var(--nav-active)] font-bold text-[var(--nav-active-fg)] shadow-[inset_3px_0_0_var(--nav-line-active)]",
      )}
    >
      {sub ? null : <span className={ICON}>{item.icon}</span>}
      <span
        className={cn(
          "truncate transition-opacity duration-200",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {item.label}
      </span>
      <Badge value={item.badge} expanded={expanded} />
    </Link>
  );
}

function NavGroup({
  item,
  expanded,
  current,
  onNavigate,
}: {
  item: ShellNavItem;
  expanded: boolean;
  current: string | null;
  onNavigate?: () => void;
}) {
  const id = useId();
  const containsActive = item.children!.some((c) => c.href === current);
  const [choice, setChoice] = useState<boolean | null>(null);
  // The group of the active page is open until the person closes it.
  const open = choice ?? containsActive;
  return (
    <div>
      <button
        type="button"
        onClick={() => setChoice(!open)}
        aria-expanded={open}
        aria-controls={id}
        title={expanded ? undefined : item.label}
        className={cn(
          ROW,
          "text-sidebar-foreground min-h-10 px-5 text-sm",
          containsActive ? "font-bold" : "font-medium",
        )}
      >
        <span className={ICON}>{item.icon}</span>
        <span
          className={cn(
            "flex-1 truncate transition-opacity duration-200",
            expanded ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {item.label}
        </span>
        <Badge value={item.badge} expanded={expanded} />
        <ChevronRight
          aria-hidden
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-[transform,opacity] duration-200",
            open && "rotate-90",
            expanded ? "opacity-100" : "opacity-0",
          )}
        />
      </button>
      {/* The collapsed rail shows icons only; hover or focus expands it, then the open group shows its items. */}
      <div id={id} hidden={!open || !expanded} className="grid gap-px pb-1">
        {item.children!.map((child) => (
          <NavLink
            key={child.href}
            item={child}
            expanded={expanded}
            active={child.href === current}
            sub
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function NavTree({
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
  const current = activeHref(items, pathname, roots);
  const entry = (item: ShellNavItem) =>
    item.children ? (
      item.children.length ? (
        <NavGroup
          key={item.label}
          item={item}
          expanded={expanded}
          current={current}
          onNavigate={onNavigate}
        />
      ) : null
    ) : (
      <NavLink
        key={item.href}
        item={item}
        expanded={expanded}
        active={item.href === current}
        onNavigate={onNavigate}
      />
    );
  const main = items.filter((i) => (i.section ?? "main") === "main");
  const bottom = items.filter((i) => i.section === "bottom");
  // Thin line between main entries across the whole menu width (v1.2); sub-items have none.
  const list = "grid divide-y divide-[var(--nav-sep)]";
  return (
    <nav
      aria-label={t("mainMenu")}
      className="-mx-3.5 flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-[18px] overflow-x-hidden overflow-y-auto"
    >
      <div className={list}>{main.map(entry)}</div>
      {bottom.length ? (
        <div className={cn(list, "border-sidebar-border mt-auto border-t")}>
          {bottom.map(entry)}
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
            <NavTree items={items} expanded={expanded} roots={roots} />
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
          <NavTree items={items} expanded roots={roots} onNavigate={() => setMobileOpen(false)} />
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
