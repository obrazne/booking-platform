"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field } from "@/core/admin/form";
import { createGuest } from "./actions";

/** "+ Pridať hosťa" and Export (two choices with counts, CSV). */
export function GuestsActions({ consent, all }: { consent: number; all: number }) {
  const t = useTranslations("guests");
  const tc = useTranslations("guests.card");
  const [open, setOpen] = useState(false);
  const option = (href: string, title: string, hint: string) => (
    <a
      href={href}
      download
      className="grid gap-0.5 rounded-lg px-3.5 py-3 transition-colors hover:bg-[#faf9f6]"
    >
      <span className="text-ink text-sm font-bold">{title}</span>
      <span className="text-[12.5px] leading-snug text-[#5a6672]">{hint}</span>
    </a>
  );
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus /> {t("add")}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline">
            <Download /> {t("export")}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-label={t("exportTitle")}
          className="grid w-[380px] max-w-[calc(100vw-32px)] gap-1 p-2.5"
        >
          {option(
            "/admin/guests/export?scope=consent",
            t("exportConsent", { count: consent }),
            t("exportConsentHint"),
          )}
          {option(
            "/admin/guests/export?scope=all",
            t("exportAll", { count: all }),
            t("exportAllHint"),
          )}
          <span className="px-3.5 pt-1.5 pb-1 text-xs text-[#5a6672]">{t("exportNote")}</span>
        </PopoverContent>
      </Popover>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("addHint")}</DialogDescription>
          </DialogHeader>
          <ActionForm
            action={async (prev, form) => {
              const r = await createGuest(prev, form);
              // The dialog closes after a successful save (ActionForm shows the toast).
              if (r.ok) setOpen(false);
              return r;
            }}
            resetOnSuccess
            className="gap-3"
          >
            <Field label={tc("fields.email")} htmlFor="new_guest_email">
              <Input id="new_guest_email" name="email" type="email" required maxLength={200} />
            </Field>
            <Field label={tc("fields.name")} htmlFor="new_guest_name">
              <Input id="new_guest_name" name="name" maxLength={120} />
            </Field>
            <Field label={tc("fields.phone")} htmlFor="new_guest_phone">
              <Input id="new_guest_phone" name="phone" maxLength={40} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tc("fields.country")} htmlFor="new_guest_country">
                <Input id="new_guest_country" name="country" maxLength={2} />
              </Field>
              <Field label={tc("fields.language")} htmlFor="new_guest_language">
                <Input id="new_guest_language" name="language" maxLength={2} />
              </Field>
            </div>
            <Field label={tc("fields.address")} htmlFor="new_guest_address">
              <Textarea id="new_guest_address" name="address" rows={2} maxLength={300} />
            </Field>
            <div>
              <Button type="submit" className="font-bold">
                {t("create")}
              </Button>
            </div>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
