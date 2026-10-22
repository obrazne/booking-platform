"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, SubmitButton, type ActionResult } from "@/core/admin/form";
import { approveReservation, declineReservation } from "./actions";

type Company = {
  company: string;
  company_id: string;
  tax_id: string;
  vat_id: string;
  address: string;
};

/**
 * Z77: "Schváliť" / "Zamietnuť" of a reservation waiting for the owner. With a recreation voucher the approval asks
 * for the company of the voucher and its amount (prefilled from the invoice details the guest gave, if any).
 */
export function ApprovalActions({
  id,
  label,
  voucher,
  company,
  totalLabel,
  className,
}: {
  id: string;
  label: string;
  /** "č. 123 · Firma s.r.o." when the guest pays by a recreation voucher. */
  voucher: string | null;
  company: Company | null;
  totalLabel: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {voucher ? (
        <ApproveVoucher id={id} voucher={voucher} company={company} totalLabel={totalLabel} />
      ) : (
        <ApproveSimple id={id} label={label} />
      )}
      <Decline id={id} label={label} />
    </span>
  );
}

function useClosing(
  open: (v: boolean) => void,
  fn: (prev: ActionResult, form: FormData) => Promise<ActionResult>,
) {
  return async (prev: ActionResult, form: FormData) => {
    const r = await fn(prev, form);
    if (r.ok) open(false);
    return { ...r, at: Date.now() };
  };
}

function ApproveSimple({ id, label }: { id: string; label: string }) {
  const t = useTranslations("adminV1.reservations.approval");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const action = useClosing(setOpen, (prev, form) => approveReservation(id, prev, form));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" className="font-bold">
          <Check /> {t("approve")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("approveTitle", { label })}</AlertDialogTitle>
          <AlertDialogDescription>{t("approveText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <ActionForm action={action} bar={false}>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <SubmitButton>{t("approve")}</SubmitButton>
          </AlertDialogFooter>
        </ActionForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ApproveVoucher({
  id,
  voucher,
  company,
  totalLabel,
}: {
  id: string;
  voucher: string;
  company: Company | null;
  totalLabel: string;
}) {
  const t = useTranslations("adminV1.reservations.approval");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const action = useClosing(setOpen, (prev, form) => approveReservation(id, prev, form));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" className="font-bold">
          <Check /> {t("approve")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("voucherTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("voucherText", { voucher, total: totalLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ActionForm action={action} bar={false}>
          <input type="hidden" name="voucher" value="1" />
          <Field label={t("voucherAmount")} htmlFor="v-amount" hint={t("voucherAmountHint")}>
            <Input id="v-amount" name="amount" inputMode="decimal" required autoComplete="off" />
          </Field>
          <Field label={t("company")} htmlFor="v-company">
            <Input id="v-company" name="company" required defaultValue={company?.company ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("companyId")} htmlFor="v-company-id">
              <Input
                id="v-company-id"
                name="company_id"
                required
                defaultValue={company?.company_id ?? ""}
              />
            </Field>
            <Field label={t("taxId")} htmlFor="v-tax-id">
              <Input id="v-tax-id" name="tax_id" defaultValue={company?.tax_id ?? ""} />
            </Field>
            <Field label={t("vatId")} htmlFor="v-vat-id">
              <Input id="v-vat-id" name="vat_id" defaultValue={company?.vat_id ?? ""} />
            </Field>
          </div>
          <Field label={t("address")} htmlFor="v-address">
            <Input id="v-address" name="address" required defaultValue={company?.address ?? ""} />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <SubmitButton>{t("approve")}</SubmitButton>
          </AlertDialogFooter>
        </ActionForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Decline({ id, label }: { id: string; label: string }) {
  const t = useTranslations("adminV1.reservations.approval");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const action = useClosing(setOpen, (prev, form) => declineReservation(id, prev, form));
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-[#efd6d0] text-[#a8432f] hover:bg-[#fbeceb] hover:text-[#a8432f]"
        >
          {t("decline")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("declineTitle", { label })}</AlertDialogTitle>
          <AlertDialogDescription>{t("declineText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <ActionForm action={action} bar={false}>
          <Textarea
            name="note"
            rows={2}
            placeholder={t("declineNote")}
            aria-label={t("declineNote")}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <SubmitButton variant="destructive">{t("decline")}</SubmitButton>
          </AlertDialogFooter>
        </ActionForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
