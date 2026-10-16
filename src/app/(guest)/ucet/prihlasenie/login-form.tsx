"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Captcha, captchaEnabled } from "@/core/security/captcha";
import {
  requestGuestCode,
  resetGuestLogin,
  verifyGuestCode,
  type LoginState,
} from "@/core/guest/auth";

export function LoginForm({ initialStep }: { initialStep: LoginState["step"] }) {
  const t = useTranslations("guest.account");
  const [step, setStep] = useState(initialStep);
  // Turnstile token (valid once) — a fresh one after every refused request.
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [sendState, send, sending] = useActionState(
    async (prev: LoginState, form: FormData) => {
      const next = await requestGuestCode(prev, form);
      if (next.step === "code") setStep("code");
      else setCaptchaReset((n) => n + 1);
      return next;
    },
    { step: "email", error: null },
  );
  const [verifyState, verify, verifying] = useActionState(verifyGuestCode, {
    step: "code",
    error: null,
  });

  if (step === "email") {
    return (
      <form action={send} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="g-email">{t("email")}</Label>
          <Input id="g-email" name="email" type="email" autoComplete="email" required />
        </div>
        <input type="hidden" name="captcha_token" value={captcha} />
        <Captcha
          onToken={(token) => {
            setCaptcha(token);
            if (token) setCaptchaFailed(false);
          }}
          onFail={() => setCaptchaFailed(true)}
          resetKey={captchaReset}
        />
        {captchaFailed ? (
          <p className="text-sm text-[#b5532f]">{t("errors.captchaFailed")}</p>
        ) : null}
        {sendState.error ? (
          <p className="text-sm text-[#b5532f]">{t(`errors.${sendState.error}`)}</p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-full"
          disabled={sending || (captchaEnabled && !captcha)}
        >
          {t("sendCode")}
        </Button>
      </form>
    );
  }
  return (
    <form action={verify} className="grid gap-4">
      <p className="text-muted-foreground">{t("codeSent")}</p>
      <div className="grid gap-2">
        <Label htmlFor="g-code">{t("code")}</Label>
        <Input
          id="g-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="h-12 font-mono text-xl tracking-[0.3em]"
          required
        />
      </div>
      {verifyState.error ? (
        <p className="text-sm text-[#b5532f]">{t(`errors.${verifyState.error}`)}</p>
      ) : null}
      <Button type="submit" size="lg" className="h-12 rounded-full" disabled={verifying}>
        {t("verify")}
      </Button>
      <button
        type="button"
        className="text-primary justify-self-start text-sm underline-offset-4 hover:underline"
        onClick={async () => {
          await resetGuestLogin();
          setStep("email");
        }}
      >
        {t("otherEmail")}
      </button>
    </form>
  );
}
