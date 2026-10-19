"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { confirmConsent } from "./consent";

/** The guest's own click — the only way the consent from a request is written. */
export function ConfirmConsent({ token, lead }: { token: string; lead: string }) {
  const t = useTranslations("guests.consentPage");
  const [state, setState] = useState<"open" | "done" | "failed">("open");
  const [pending, start] = useTransition();
  if (state === "done")
    return (
      <p role="status" className="text-lg leading-relaxed">
        {t("done")}
      </p>
    );
  return (
    <div className="grid gap-5">
      <p className="text-lg leading-relaxed">{lead}</p>
      {state === "failed" ? (
        <p role="status" className="text-destructive">
          {t("expired")}
        </p>
      ) : null}
      <div>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => setState((await confirmConsent(token)) ? "done" : "failed"))
          }
        >
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
