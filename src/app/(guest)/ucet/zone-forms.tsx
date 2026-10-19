"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  requestStayCancellation,
  setGuestMarketing,
  updateGuestContact,
  type FormState,
} from "@/core/guest/actions";
import { useUnsavedForm } from "@/core/forms/unsaved";

const INITIAL: FormState = { ok: false, error: false };

export function ContactForm({
  guest,
}: {
  guest: { name: string | null; phone: string | null; country: string | null };
}) {
  const t = useTranslations("guest.account");
  const [state, action] = useActionState<FormState, FormData>(updateGuestContact, INITIAL);
  // Saved through the bar of unsaved changes, confirmed by a toast (Z55, rule 3).
  const form = useRef<HTMLFormElement>(null);
  const { saved } = useUnsavedForm(form);
  useEffect(() => {
    if (state === INITIAL) return;
    if (state.ok) {
      toast.success(t("saved"), { id: "form-saved" });
      saved();
    } else toast.error(t("saveFailed"));
  }, [state, t, saved]);
  return (
    <form ref={form} action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="z-name">{t("name")}</Label>
        <Input id="z-name" name="name" defaultValue={guest.name ?? ""} required maxLength={120} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="z-phone">{t("phone")}</Label>
        <Input id="z-phone" name="phone" type="tel" defaultValue={guest.phone ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="z-country">{t("country")}</Label>
        <Input id="z-country" name="country" defaultValue={guest.country ?? ""} maxLength={2} />
      </div>
      <button type="submit" hidden aria-hidden tabIndex={-1} />
    </form>
  );
}

/** News by e-mail (Z68: the text of the consent v1.6 with the name of the accommodation). */
export function MarketingToggle({ granted, name }: { granted: boolean; name: string }) {
  const t = useTranslations("guest.account");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        {t(granted ? "marketingOn" : "marketingOff", { name })}
      </p>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start rounded-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            // An instant switch: saved right away and confirmed by a toast (rule 3).
            await setGuestMarketing(!granted);
            toast.success(t(granted ? "marketingOffToast" : "marketingOnToast"));
          })
        }
      >
        {t(granted ? "marketingRevoke" : "marketingGrant")}
      </Button>
    </div>
  );
}

export function CancelStayForm({ reservationId }: { reservationId: string }) {
  const t = useTranslations("guest.reservation");
  const [state, action, pending] = useActionState(
    requestStayCancellation.bind(null, reservationId),
    { done: false },
  );
  if (state.done) return <p className="text-sm">{t("cancelRequested")}</p>;
  return (
    <form action={action} className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("cancelHint")}</p>
      <Textarea name="note" rows={2} placeholder={t("cancelNote")} maxLength={2000} />
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="justify-self-start rounded-full"
      >
        {t("cancelRequest")}
      </Button>
    </form>
  );
}
