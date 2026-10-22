"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/core/admin/form";
import { createGiftVoucher } from "./actions";

/** "+ Nový poukaz" (Z78): value, on whose name, valid until, note for the team. */
export function GiftVouchersActions() {
  const t = useTranslations("giftVouchers");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="font-bold">
        <Plus /> {t("add")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>
          <ActionForm
            action={async (prev, form) => {
              const r = await createGiftVoucher(prev, form);
              if (r.ok) setOpen(false);
              return r;
            }}
            resetOnSuccess
            className="gap-3"
          >
            <Field label={t("fields.amount")} htmlFor="gv-amount">
              <Input id="gv-amount" name="amount" inputMode="decimal" required autoComplete="off" />
            </Field>
            <Field
              label={t("fields.recipient")}
              htmlFor="gv-recipient"
              hint={t("fields.recipientHint")}
            >
              <Input id="gv-recipient" name="recipient_name" maxLength={120} />
            </Field>
            <Field
              label={t("fields.validUntil")}
              htmlFor="gv-valid"
              hint={t("fields.validUntilHint")}
            >
              <Input id="gv-valid" name="valid_until" type="date" />
            </Field>
            <Field label={t("fields.note")} htmlFor="gv-note" hint={t("fields.noteHint")}>
              <Input id="gv-note" name="note" maxLength={500} />
            </Field>
            <div>
              <Button type="submit" className="font-bold">
                {t("create")}
              </Button>
            </div>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </>
  );
}
