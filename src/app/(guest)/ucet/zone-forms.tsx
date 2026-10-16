"use client";

import { useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
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

export function ContactForm({
  guest,
}: {
  guest: { name: string | null; phone: string | null; country: string | null };
}) {
  const t = useTranslations("guest.account");
  const [state, action, pending] = useActionState<FormState, FormData>(updateGuestContact, {
    ok: false,
    error: false,
  });
  return (
    <form action={action} className="grid gap-3">
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
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" className="rounded-full" disabled={pending}>
          {t("save")}
        </Button>
        {state.ok ? <span className="text-muted-foreground text-sm">{t("saved")}</span> : null}
      </div>
    </form>
  );
}

export function MarketingToggle({ granted }: { granted: boolean }) {
  const t = useTranslations("guest.account");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t(granted ? "marketingOn" : "marketingOff")}</p>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start rounded-full"
        disabled={pending}
        onClick={() => start(() => setGuestMarketing(!granted))}
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
