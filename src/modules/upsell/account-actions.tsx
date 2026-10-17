"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/core/admin/form";
import { decideOrder, settleStayAccount } from "./actions";

function useRun() {
  const t = useTranslations("modules.upsell.account");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else toast.error(t("error"));
    });
  return { pending, run };
}

/** Potvrdiť / Zamietnuť (with a reason) of one order. */
export function OrderDecision({
  id,
  label,
  canConfirm,
}: {
  id: string;
  label: string;
  canConfirm: boolean;
}) {
  const t = useTranslations("modules.upsell.account");
  const { pending, run } = useRun();
  const [reason, setReason] = useState("");
  return (
    <span className="flex flex-wrap gap-2">
      {canConfirm ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          aria-label={`${t("confirm")} — ${label}`}
          onClick={() => run(() => decideOrder(id, true))}
        >
          {t("confirm")}
        </Button>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={`${t("decline")} — ${label}`}
          >
            {t("decline")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("declineTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {label} — {t("declineText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            aria-label={t("reason")}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim()}
              onClick={() => run(() => decideOrder(id, false, reason))}
            >
              {t("decline")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}

/** "Vyúčtovať" — on site or by transfer. */
export function SettleButton({
  reservationId,
  amountLabel,
}: {
  reservationId: string;
  amountLabel: string;
}) {
  const t = useTranslations("modules.upsell.account");
  const { pending, run } = useRun();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" className="font-bold" disabled={pending}>
          {t("settle")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("settleTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("settleText", { amount: amountLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-background text-foreground border-input hover:bg-muted border"
            onClick={() => run(() => settleStayAccount(reservationId, "bank_transfer"))}
          >
            {t("transfer")}
          </AlertDialogAction>
          <AlertDialogAction onClick={() => run(() => settleStayAccount(reservationId, "on_site"))}>
            {t("onSite")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
