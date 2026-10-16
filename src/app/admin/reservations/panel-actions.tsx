"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, SubmitButton, type ActionResult } from "@/core/admin/form";
import {
  addNote,
  cancelReservation,
  confirmPayment,
  declineCancellationRequest,
  setProgress,
} from "./actions";

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

export function ReservationActions({
  id,
  status,
  amountLabel,
  hasRequest,
}: {
  id: string;
  status: string;
  amountLabel: string;
  hasRequest: boolean;
}) {
  const t = useTranslations("reservations.panel");
  const { pending, run } = useRun();
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "pending_payment" ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => confirmPayment(id), t("confirmPaymentConfirm", { amount: amountLabel }))
            }
          >
            {t("confirmPayment")}
          </Button>
        ) : null}
        {status === "confirmed" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setProgress(id, "in_progress"))}
          >
            {t("checkIn")}
          </Button>
        ) : null}
        {status === "in_progress" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setProgress(id, "completed"))}
          >
            {t("checkOut")}
          </Button>
        ) : null}
        {hasRequest ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => declineCancellationRequest(id))}
          >
            {t("declineRequest")}
          </Button>
        ) : null}
      </div>
      {["pending_payment", "confirmed", "in_progress"].includes(status) ? (
        <ActionForm
          action={cancelReservation.bind(null, id)}
          className="sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <Input
            name="reason"
            placeholder={t("cancelReason")}
            aria-label={t("cancelReason")}
            maxLength={500}
          />
          <SubmitButton variant="destructive">{t("cancel")}</SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const t = useTranslations("reservations.panel");
  return (
    <ActionForm action={addNote.bind(null, id)} resetOnSuccess>
      <Textarea name="body" rows={2} placeholder={t("notePlaceholder")} maxLength={4000} />
      <SubmitButton variant="outline">{t("addNote")}</SubmitButton>
    </ActionForm>
  );
}
