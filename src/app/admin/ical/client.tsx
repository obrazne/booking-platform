"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/core/admin/form";

export function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("ical");
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex gap-2">
        <Input
          readOnly
          aria-label={label}
          value={value}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("copy")}
          onClick={() =>
            navigator.clipboard.writeText(value).then(() => toast.success(t("copied")))
          }
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}

export function SyncButton({ action }: { action: () => Promise<ActionResult> }) {
  const t = useTranslations("ical");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await action();
          toast.success(t("synced"));
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} /> {t("syncNow")}
    </Button>
  );
}
