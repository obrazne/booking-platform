"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Delete with confirmation; `action` is a server action bound to the record. */
export function DeleteButton({ action }: { action: () => Promise<void> }) {
  const t = useTranslations("forms");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("confirmDelete"))) return;
        start(async () => {
          await action();
          toast.success(t("deleted"));
        });
      }}
    >
      <Trash2 /> {t("delete")}
    </Button>
  );
}
