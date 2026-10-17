"use client";

import { useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/core/admin/form";
import { confirmPayment, extendPaymentDue } from "./actions";

function useRun() {
  const t = useTranslations("forms");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(t("saved"));
      else toast.error(t(`errors.${r.error ?? "generic"}` as "errors.generic"));
    });
  };
  return { pending, run };
}

/** "Platba prijatá" — confirms the bank transfer (with a confirmation naming the amount). */
export function MarkPaidButton({
  id,
  amountLabel,
  className,
  children,
}: {
  id: string;
  amountLabel: string;
  className?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("reservations.panel");
  const { pending, run } = useRun();
  return (
    <Button
      type="button"
      disabled={pending}
      className={className}
      onClick={() =>
        run(() => confirmPayment(id), t("confirmPaymentConfirm", { amount: amountLabel }))
      }
    >
      <Check /> {children ?? t("confirmPayment")}
    </Button>
  );
}

/** "Predĺžiť splatnosť" by one day. */
export function ExtendDueButton({ id, className }: { id: string; className?: string }) {
  const t = useTranslations("reservations.panel");
  const { pending, run } = useRun();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      className={className}
      onClick={() => run(() => extendPaymentDue(id, 24))}
    >
      {t("extendDue")}
    </Button>
  );
}
