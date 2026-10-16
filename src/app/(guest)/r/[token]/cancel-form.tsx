"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestCancellation } from "@/core/booking/guest-actions";

export function CancelForm({ token }: { token: string }) {
  const t = useTranslations("guest.reservation");
  const [state, action, pending] = useActionState(requestCancellation.bind(null, token), {
    done: false,
  });
  if (state.done) return <p className="text-sm">{t("cancelRequested")}</p>;
  return (
    <form action={action} className="grid gap-3">
      <p className="text-muted-foreground text-sm">{t("cancelHint")}</p>
      <Textarea name="note" rows={2} placeholder={t("cancelNote")} maxLength={2000} />
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
        {t("cancelRequest")}
      </Button>
    </form>
  );
}
