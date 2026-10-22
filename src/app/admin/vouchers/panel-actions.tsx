"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Send } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ActionForm, Field, SubmitButton, type ActionResult } from "@/core/admin/form";
import { cancelGiftVoucher, sendGiftVoucher, updateGiftVoucher } from "./actions";

/** Stiahnuť PDF · Poslať e-mailom · Zrušiť poukaz (Z78). */
export function GiftVoucherActions({
  id,
  code,
  usable,
  pdfHref,
}: {
  id: string;
  code: string;
  usable: boolean;
  pdfHref: string;
}) {
  const t = useTranslations("giftVouchers.panel");
  const tc = useTranslations("common");
  const tf = useTranslations("forms");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const send = async (prev: ActionResult, form: FormData) => {
    const r = await sendGiftVoucher(id, prev, form);
    if (r.ok) {
      setOpen(false);
      toast.success(t("sent", { email: r.email ?? "" }));
    } else toast.error(t("sendFailed"));
    // Our own toast (with the address): no `at`, so the form shows none of its own.
    return { ok: r.ok };
  };
  return (
    <>
      <Button asChild variant="outline">
        <a href={pdfHref} download>
          <Download /> {t("pdf")}
        </a>
      </Button>
      {usable ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline">
              <Send /> {t("send")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("send")}</AlertDialogTitle>
              <AlertDialogDescription>{code}</AlertDialogDescription>
            </AlertDialogHeader>
            <ActionForm action={send} bar={false}>
              <Field label={t("sendTo")} htmlFor="gv-send-email">
                <Input id="gv-send-email" name="email" type="email" required maxLength={200} />
              </Field>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                <SubmitButton>{t("sendSubmit")}</SubmitButton>
              </AlertDialogFooter>
            </ActionForm>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      <span className="ml-auto" />
      {usable ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="border-[#efd6d0] text-[#a8432f] hover:bg-[#fbeceb] hover:text-[#a8432f]"
          onClick={() => {
            if (!window.confirm(t("cancelConfirm", { code }))) return;
            start(async () => {
              const r = await cancelGiftVoucher(id);
              if (r.ok) toast.success(tf("saved"));
              else toast.error(tf(`errors.${r.error ?? "generic"}` as "errors.generic"));
            });
          }}
        >
          {t("cancel")}
        </Button>
      ) : null}
    </>
  );
}

/** Name on the voucher, until when and the note (the value and the code stay). */
export function GiftVoucherEdit({
  id,
  recipient,
  validUntil,
  note,
}: {
  id: string;
  recipient: string;
  validUntil: string;
  note: string;
}) {
  const t = useTranslations("giftVouchers");
  const tf = useTranslations("forms");
  return (
    <ActionForm action={updateGiftVoucher.bind(null, id)} bar={false} className="gap-3">
      <Field label={t("fields.recipient")} htmlFor="gv-edit-recipient">
        <Input
          id="gv-edit-recipient"
          name="recipient_name"
          defaultValue={recipient}
          maxLength={120}
        />
      </Field>
      <Field
        label={t("fields.validUntil")}
        htmlFor="gv-edit-valid"
        hint={t("fields.validUntilHint")}
      >
        <Input id="gv-edit-valid" name="valid_until" type="date" defaultValue={validUntil} />
      </Field>
      <Field label={t("fields.note")} htmlFor="gv-edit-note" hint={t("fields.noteHint")}>
        <Input id="gv-edit-note" name="note" defaultValue={note} maxLength={500} />
      </Field>
      <div>
        <SubmitButton>{tf("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}
