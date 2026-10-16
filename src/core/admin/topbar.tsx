"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Building2,
  Check,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function TenantSwitcher({
  tenants,
  activeId,
}: {
  tenants: { id: string; name: string }[];
  activeId: string;
}) {
  const t = useTranslations("shell");
  const [pending, startTransition] = useTransition();
  const active = tenants.find((x) => x.id === activeId);

  if (tenants.length < 2) {
    return <span className="mr-auto truncate text-sm font-medium">{active?.name}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="mr-auto max-w-64 gap-2" disabled={pending}>
          <Building2 />
          <span className="truncate">{active?.name}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
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

export function UserMenu({ email }: { email: string | null }) {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("shell.account")}>
          <UserRound />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
