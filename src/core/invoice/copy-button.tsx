"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** "Kopírovať" of the invoice basis (Z51): the plain text goes to the clipboard for the client's invoicing tool. */
export function CopyBasisButton({ text, label }: { text: string; label?: string }) {
  const t = useTranslations("invoice");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(t("copied"));
        } catch {
          toast.error(t("copyFailed"));
        }
      }}
    >
      <Copy /> {label ?? t("copy")}
    </Button>
  );
}
