"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendLoginLink, signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

/**
 * E-mail and password; the sign-in link on e-mail is the second way in (also behind "Zabudnuté heslo?").
 */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signIn, initialState);
  const [linkState, linkAction, linkPending] = useActionState(sendLoginLink, initialState);
  const [show, setShow] = useState(false);
  const error = state.error ?? linkState.error;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-ink">
          {t("email")}
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password" className="text-ink">
            {t("password")}
          </Label>
          <button
            type="submit"
            formAction={linkAction}
            formNoValidate
            className="text-ink text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("forgot")}
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? t("hidePassword") : t("showPassword")}
            aria-pressed={show}
            className="text-muted-foreground hover:text-ink absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[#a8432f]">
          {t(error)}
        </p>
      ) : null}
      {linkState.linkSent ? (
        <p role="status" className="bg-accent-soft text-ink rounded-[10px] p-3.5 text-sm">
          {t("linkSent")}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full text-[15px] font-bold">
        {t("submit")}
      </Button>
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span className="bg-line h-px flex-1" />
        {t("or")}
        <span className="bg-line h-px flex-1" />
      </div>
      <Button
        type="submit"
        size="lg"
        variant="outline"
        formAction={linkAction}
        formNoValidate
        disabled={linkPending}
        className="text-ink w-full text-[15px]"
      >
        <Mail /> {t("sendLink")}
      </Button>
      <p className="text-muted-foreground text-sm">
        {t.rich("guestHint", { b: (c) => <strong className="text-ink font-medium">{c}</strong> })}
      </p>
    </form>
  );
}
