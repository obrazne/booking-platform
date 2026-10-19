"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field } from "@/core/admin/form";
import { requestConsent, revokeConsent, saveGuestNote, updateGuest } from "./actions";

type Contact = {
  id: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  language: string | null;
  address: string | null;
};

/** Kontakt › Upraviť: the form in place of the read-only rows. */
export function ContactEdit({ guest, children }: { guest: Contact; children: React.ReactNode }) {
  const t = useTranslations("guests.card");
  const [editing, setEditing] = useState(false);
  return (
    <section className="grid min-w-0 gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-mono">{t("contact")}</h3>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
          className="text-ink text-[13px] font-medium hover:underline"
        >
          {editing ? t("cancel") : t("edit")}
        </button>
      </div>
      {editing ? (
        // In the panel the bar of the page is behind the panel — its own Uložiť (as other panel forms).
        <ActionForm
          action={async (prev, form) => {
            const r = await updateGuest(prev, form);
            if (r.ok) setEditing(false);
            return r;
          }}
          className="gap-3"
          bar={false}
        >
          <input type="hidden" name="id" value={guest.id} />
          <Field label={t("fields.name")} htmlFor="guest_name">
            <Input id="guest_name" name="name" defaultValue={guest.name ?? ""} maxLength={120} />
          </Field>
          <Field label={t("fields.phone")} htmlFor="guest_phone">
            <Input id="guest_phone" name="phone" defaultValue={guest.phone ?? ""} maxLength={40} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("fields.country")} htmlFor="guest_country">
              <Input
                id="guest_country"
                name="country"
                defaultValue={guest.country ?? ""}
                maxLength={2}
              />
            </Field>
            <Field label={t("fields.language")} htmlFor="guest_language">
              <Input
                id="guest_language"
                name="language"
                defaultValue={guest.language ?? ""}
                maxLength={2}
              />
            </Field>
          </div>
          <Field label={t("fields.address")} htmlFor="guest_address">
            <Textarea
              id="guest_address"
              name="address"
              rows={2}
              defaultValue={guest.address ?? ""}
              maxLength={300}
            />
          </Field>
          <div>
            <Button type="submit" size="sm" className="font-bold">
              {t("save")}
            </Button>
          </div>
        </ActionForm>
      ) : (
        children
      )}
    </section>
  );
}

/** Revoke in the guest's name (with the reason) or send the request — the rules live in the database. */
export function ConsentActions({
  id,
  email,
  consent,
  block,
}: {
  id: string;
  email: string;
  consent: boolean;
  /** Why a request cannot be sent now (null = it can). */
  block: string | null;
}) {
  const t = useTranslations("guests.card");
  const [revoking, setRevoking] = useState(false);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  if (consent)
    return revoking ? (
      <ActionForm action={revokeConsent} className="gap-3" resetOnSuccess>
        <input type="hidden" name="id" value={id} />
        <Field label={t("revokeReason")} htmlFor="revoke_reason">
          <Input
            id="revoke_reason"
            name="reason"
            required
            maxLength={300}
            placeholder={t("revokeReasonPlaceholder")}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" size="sm">
            {t("revokeConfirm")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRevoking(false)}>
            {t("cancel")}
          </Button>
        </div>
      </ActionForm>
    ) : (
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRevoking(true)}>
          {t("revoke")}
        </Button>
      </div>
    );
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-[#5a6672]">{t("cantEnable")}</p>
      {sent ? (
        <p role="status" className="text-sm text-[#2f5d50]">
          {t("requested", { email })}
        </p>
      ) : block ? (
        <p className="text-sm text-[#5a6672]">{block}</p>
      ) : (
        <div className="grid gap-1">
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await requestConsent(id);
                  if (r.ok) setSent(true);
                  else toast.error(t("failed"));
                })
              }
            >
              {t("request")}
            </Button>
          </div>
          <p className="text-xs text-[#5a6672]">{t("requestHint")}</p>
        </div>
      )}
    </div>
  );
}

/** The team's note (its own button: the bar of the page is behind the panel). */
export function NoteForm({ id, body }: { id: string; body: string }) {
  const t = useTranslations("guests.card");
  return (
    <ActionForm action={saveGuestNote} className="gap-2" bar={false}>
      <input type="hidden" name="id" value={id} />
      <label className="grid gap-2">
        <span className="label-mono">{t("note")}</span>
        <Textarea
          name="body"
          rows={3}
          maxLength={2000}
          defaultValue={body}
          placeholder={t("notePlaceholder")}
        />
      </label>
      <div>
        <Button type="submit" size="sm" variant="outline">
          {t("noteSave")}
        </Button>
      </div>
    </ActionForm>
  );
}
