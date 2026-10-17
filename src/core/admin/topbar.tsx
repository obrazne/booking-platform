"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Building2, Check, ChevronsUpDown, Monitor, Moon, MoreHorizontal, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchTenant } from "@/app/admin/actions";
import { signOut } from "@/app/(auth)/login/actions";
import { openTour } from "@/core/tours/tour-dialog";
import { cn } from "@/lib/utils";
import { useShellExpanded } from "./admin-shell";

/** Accommodation picker at the top of the side menu ("Ubytovanie / Chalet STRÖMY"). */
export function TenantSwitcher({
  tenants,
  activeId,
}: {
  tenants: { id: string; name: string }[];
  activeId: string;
}) {
  const t = useTranslations("shell");
  const expanded = useShellExpanded();
  const [pending, startTransition] = useTransition();
  const active = tenants.find((x) => x.id === activeId);
  const several = tenants.length > 1;

  const box = (
    <span
      className={cn(
        "border-input bg-background flex min-h-12 w-full items-center gap-2.5 rounded-[10px] border text-left",
        expanded ? "px-3 py-2" : "justify-center px-0",
      )}
    >
      {expanded ? (
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="label-mono">{t("accommodation")}</span>
          <span className="text-ink truncate text-sm font-bold">{active?.name}</span>
        </span>
      ) : (
        <Building2 className="text-ink size-[18px]" aria-label={active?.name} />
      )}
      {several && expanded ? <ChevronsUpDown className="text-muted-foreground size-3.5" /> : null}
    </span>
  );

  // One accommodation: only its name, no picker (v1.1).
  if (!several) {
    return (
      <span
        className={cn(
          "flex min-h-10 items-center gap-2.5 px-1",
          expanded ? "opacity-100" : "justify-center",
        )}
      >
        {expanded ? (
          <span className="flex min-w-0 flex-col gap-px">
            <span className="label-mono">{t("accommodation")}</span>
            <span className="text-ink truncate text-sm font-bold">{active?.name}</span>
          </span>
        ) : (
          <Building2 className="text-ink size-[18px]" aria-label={active?.name} />
        )}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={t("switchTenant")}
        className="rounded-[10px]"
      >
        {box}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("switchTenant")}</DropdownMenuLabel>
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onSelect={() => startTransition(() => switchTenant(tenant.id))}
          >
            <span className="flex-1 truncate">{tenant.name}</span>
            {tenant.id === activeId ? <Check /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** User at the bottom of the side menu: name, "Čo je nové · Odhlásiť" and the colour mode in the ⋯ menu. */
export function UserMenu({
  name,
  email,
  whatsNew = false,
}: {
  name: string | null;
  email: string | null;
  whatsNew?: boolean;
}) {
  const t = useTranslations();
  const expanded = useShellExpanded();
  const { theme, setTheme } = useTheme();
  const label = name || email || "";

  return (
    <div className="flex items-center gap-2.5 px-1 pt-1">
      <span
        title={label}
        className="avatar text-ink flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7e4dc] text-xs font-bold"
      >
        {initials(label)}
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-opacity",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <span className="text-ink truncate text-[13px] font-medium">{label}</span>
        <span className="text-muted-foreground flex gap-1 text-xs">
          {whatsNew ? (
            <>
              <button type="button" onClick={openTour} data-closes-menu className="hover:text-ink">
                {t("tours.menu")}
              </button>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <button type="button" onClick={() => void signOut()} className="hover:text-ink">
            {t("common.signOut")}
          </button>
        </span>
      </span>
      {expanded ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("shell.account")}
            className="text-muted-foreground hover:text-ink inline-flex size-8 items-center justify-center rounded-full"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60">
            {email ? (
              <DropdownMenuLabel className="truncate font-normal">{email}</DropdownMenuLabel>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t("shell.colorMode")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun /> {t("shell.light")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon /> {t("shell.dark")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor /> {t("shell.system")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
