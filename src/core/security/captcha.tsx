"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Captcha is shown only when the site key is set; without it (local development, CI) forms work without it. */
export const captchaEnabled = Boolean(SITE_KEY);

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error()));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget (managed mode — most people only see a tick). The token goes to `onToken`
 * ("" when it expired or was reset); every change of `resetKey` asks for a fresh one, because a token is valid once.
 */
export function Captcha({
  onToken,
  onFail,
  resetKey = 0,
  className,
}: {
  onToken: (token: string) => void;
  onFail?: () => void;
  resetKey?: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onFail });
  useEffect(() => {
    callbacks.current = { onToken, onFail };
  });

  useEffect(() => {
    if (!captchaEnabled) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          language: "auto",
          "response-field": false,
          "refresh-expired": "auto",
          callback: (token: string) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(""),
          "error-callback": () => {
            callbacks.current.onToken("");
            callbacks.current.onFail?.();
          },
        });
      })
      .catch(() => callbacks.current.onFail?.());
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (!resetKey || !widget.current) return;
    callbacks.current.onToken("");
    window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!captchaEnabled) return null;
  return <div ref={box} className={className} />;
}
