"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestGuestCode,
  resetGuestLogin,
  verifyGuestCode,
  type LoginState,
} from "@/core/guest/auth";
import { Captcha, captchaEnabled } from "@/core/security/captcha";

const RESEND_SECONDS = 45;

/** Boxes for the code: typing moves on, Backspace moves back, pasting the whole code fills all boxes. */
function CodeBoxes({
  length,
  label,
  digitLabel,
}: {
  length: number;
  label: string;
  digitLabel: (n: number) => string;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function fill(from: number, text: string) {
    const clean = text.replace(/\D/g, "").slice(0, length - from);
    if (!clean) return;
    const next = [...digits];
    clean.split("").forEach((d, i) => (next[from + i] = d));
    setDigits(next);
    refs.current[Math.min(from + clean.length, length - 1)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex gap-1.5 sm:gap-2">
      <input type="hidden" name="code" value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={digitLabel(i + 1)}
          autoFocus={i === 0}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length > 1) return fill(i, v);
            const next = [...digits];
            next[i] = v.replace(/\D/g, "");
            setDigits(next);
            if (next[i] && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            fill(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className="border-input text-ink focus:border-ink h-14 w-full min-w-0 rounded-[10px] border bg-white text-center font-mono text-2xl outline-none focus:ring-3 focus:ring-[#11212f]/10 sm:h-[58px]"
        />
      ))}
    </div>
  );
}

/**
 * 08 Guest login (B10, vizuál administrácie v1): step 1 e-mail + captcha, step 2 code boxes, change e-mail,
 * send again after a countdown (with a fresh captcha — a token is valid once). Logic from Z17 unchanged.
 */
export function LoginForm({
  initialStep,
  initialEmail,
  initialLength,
}: {
  initialStep: LoginState["step"];
  initialEmail: string | null;
  initialLength: number;
}) {
  const t = useTranslations("guest.account");
  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [length, setLength] = useState(initialLength);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(RESEND_SECONDS);
  // Turnstile token (valid once) — a fresh one after every refused request.
  const [captcha, setCaptcha] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [sendState, send, sending] = useActionState(
    async (prev: LoginState, form: FormData) => {
      const next = await requestGuestCode(prev, form);
      if (next.step === "code") {
        setStep("code");
        setEmail(next.email ?? null);
        setLength(next.codeLength ?? 6);
        setRound((r) => r + 1);
        setLeft(RESEND_SECONDS);
      }
      setCaptchaReset((n) => n + 1);
      return next;
    },
    { step: "email", error: null },
  );
  const [verifyState, verify, verifying] = useActionState(verifyGuestCode, {
    step: "code",
    error: null,
  });

  useEffect(() => {
    if (step !== "code" || left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [step, left]);

  const captchaBox = (
    <>
      <input type="hidden" name="captcha_token" value={captcha} />
      <Captcha
        onToken={(token) => {
          setCaptcha(token);
          if (token) setCaptchaFailed(false);
        }}
        onFail={() => setCaptchaFailed(true)}
        resetKey={captchaReset}
      />
      {captchaFailed ? <p className="text-sm text-[#b5532f]">{t("errors.captchaFailed")}</p> : null}
    </>
  );

  const heading = (
    <div className="grid gap-2">
      <span className="kicker text-brand-secondary">{t("loginKicker")}</span>
      <h1 className="text-ink text-[28px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[32px]">
        {step === "email" ? t("loginTitle") : t("codeTitle")}
      </h1>
      <p className="text-muted-foreground">
        {step === "email" ? t("loginSubtitle") : email ? t("codeSentTo", { email }) : t("codeSent")}
      </p>
    </div>
  );

  if (step === "email") {
    return (
      <div className="grid gap-7">
        {heading}
        <form action={send} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="g-email" className="text-ink">
              {t("email")}
            </Label>
            <Input
              id="g-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email ?? ""}
              required
              className="h-[46px] rounded-full px-4"
            />
          </div>
          {captchaBox}
          {sendState.error ? (
            <p className="text-sm text-[#b5532f]">{t(`errors.${sendState.error}`)}</p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="h-[46px] rounded-full text-[15px] font-bold"
            disabled={sending || (captchaEnabled && !captcha)}
          >
            {t("sendCode")}
          </Button>
          <p className="text-muted-foreground text-sm">{t("noPassword")}</p>
        </form>
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {heading}
      <form action={verify} className="grid gap-4">
        <CodeBoxes
          key={`${round}-${length}`}
          length={length}
          label={t("code")}
          digitLabel={(n) => t("digit", { n, total: length })}
        />
        {verifyState.error ? (
          <p className="text-sm text-[#b5532f]">{t(`errors.${verifyState.error}`)}</p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-[46px] rounded-full text-[15px] font-bold"
          disabled={verifying}
        >
          {t("verify")}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          className="text-ink inline-flex min-h-11 items-center gap-1 font-medium underline-offset-4 hover:underline"
          onClick={async () => {
            await resetGuestLogin();
            setStep("email");
          }}
        >
          <ChevronLeft className="size-4" /> {t("otherEmail")}
        </button>
        {left > 0 ? (
          <span className="text-muted-foreground tabular-nums" aria-live="off">
            {t("resendIn", { time: `0:${String(left).padStart(2, "0")}` })}
          </span>
        ) : null}
      </div>
      {left <= 0 && email ? (
        <form action={send} className="grid gap-3">
          <input type="hidden" name="email" value={email} />
          {captchaBox}
          {sendState.error ? (
            <p className="text-sm text-[#b5532f]">{t(`errors.${sendState.error}`)}</p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            className="h-11 rounded-full"
            disabled={sending || (captchaEnabled && !captcha)}
          >
            {t("resend")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
