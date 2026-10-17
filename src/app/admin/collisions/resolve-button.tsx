"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveCollision } from "./actions";

/** "Označiť ako vyriešené" (or "Znovu otvoriť" a resolved one). */
export function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const t = useTranslations("collisions");
  const tf = useTranslations("forms");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={resolved ? "outline" : "default"}
      disabled={pending}
      className="min-h-11 font-bold"
      onClick={() =>
        start(async () => {
          const r = await resolveCollision(id, !resolved);
          if (r.ok) toast.success(resolved ? t("reopened") : t("resolvedToast"));
          else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
        })
      }
    >
      {resolved ? <RotateCcw /> : <Check />} {resolved ? t("reopen") : t("resolve")}
    </Button>
  );
}
