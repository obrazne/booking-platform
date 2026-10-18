"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
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
import { ActionForm, SubmitButton, type ActionResult } from "@/core/admin/form";
import { addNote, cancelReservation, declineCancellationRequest, setProgress } from "./actions";

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

/** Check-in / check-out of a paid stay and declining a guest's cancellation request. */
export function ReservationActions({
  id,
  status,
  hasRequest,
}: {
  id: string;
  status: string;
  hasRequest: boolean;
}) {
  const t = useTranslations("reservations.panel");
  const { pending, run } = useRun();
  if (status !== "confirmed" && status !== "in_progress" && !hasRequest) return null;
  return (
    <div className="flex flex-wrap gap-2">
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
  );
}

/** "Zrušiť rezerváciu" — red outline, asks for confirmation and an optional reason. */
export function CancelReservationButton({ id, label }: { id: string; label: string }) {
  const t = useTranslations("reservations.panel");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const action = async (prev: ActionResult, form: FormData) => {
    const r = await cancelReservation(id, prev, form);
    if (r.ok) setOpen(false);
    return { ...r, at: Date.now() };
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-[#efd6d0] text-[#a8432f] hover:bg-[#fbeceb] hover:text-[#a8432f]"
        >
          {t("cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancelTitle", { label })}</AlertDialogTitle>
          <AlertDialogDescription>{t("cancelText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <ActionForm action={action} bar={false}>
          <Textarea
            name="reason"
            rows={2}
            placeholder={t("cancelReason")}
            aria-label={t("cancelReason")}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <SubmitButton variant="destructive">{t("cancel")}</SubmitButton>
          </AlertDialogFooter>
        </ActionForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Internal note ("Vidíte len vy a váš tím"). */
export function NoteForm({ id }: { id: string }) {
  const t = useTranslations("reservations.panel");
  return (
    <ActionForm action={addNote.bind(null, id)} resetOnSuccess>
      <Textarea name="body" rows={2} placeholder={t("notePlaceholder")} maxLength={4000} />
      <div>
        <SubmitButton variant="outline">{t("addNote")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
