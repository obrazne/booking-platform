"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BellRing, Send, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { removePushDevice, savePushDevice, sendTestPush, updatePushKinds } from "./actions";
import type { MyPushDevice, PushScope } from "./load";

type Env = "loading" | "ios" | "unsupported" | "ready";

const SW_URL = "/push-sw.js";

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const noSubscribe = () => () => {};

/** What this browser can do: iPhone/iPad outside the home screen gets the guide instead of the switch. */
function detectEnv(): Env {
  if (isIos() && !isStandalone()) return "ios";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return "ready";
}

/** Short description of this device for the list, e.g. "iPhone · Safari". */
function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [os, browser].filter(Boolean).join(" · ");
}

/**
 * Settings → "Upozornenia na tomto zariadení" (Z33): switch push on for this browser, kinds for this device, a test
 * notification and the list of my devices. On iPhone/iPad outside the home screen a 3-step guide instead.
 */
export function PushSettings({
  scope,
  publicKey,
  devices,
  kindOptions,
  defaultKinds,
}: {
  scope: PushScope;
  publicKey: string | null;
  devices: MyPushDevice[];
  kindOptions: { kind: string; label: string }[];
  defaultKinds: readonly string[];
}) {
  const t = useTranslations("push");
  const locale = useLocale();
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const current = devices.find((d) => d.endpoint === endpoint) ?? null;

  const env = useSyncExternalStore<Env>(noSubscribe, detectEnv, () => "loading");

  useEffect(() => {
    if (env !== "ready") return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => setEndpoint(null));
  }, [env]);

  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric" }).format(
      new Date(iso),
    );

  const enable = () =>
    start(async () => {
      setMessage(null);
      if (!publicKey) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(t("denied"));
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToBytes(publicKey),
          }));
        const result = await savePushDevice(scope, sub.toJSON(), deviceName(), [...defaultKinds]);
        if (!result.ok) throw new Error("save");
        setEndpoint(sub.endpoint);
      } catch {
        setMessage(t("failed"));
      }
    });

  const remove = (id: string) =>
    start(async () => {
      setMessage(null);
      await removePushDevice(scope, id);
    });

  const toggleKind = (kind: string, on: boolean) => {
    if (!current) return;
    const next = on ? [...current.kinds, kind] : current.kinds.filter((k) => k !== kind);
    start(async () => {
      await updatePushKinds(scope, current.id, next);
    });
  };

  const test = () =>
    start(async () => {
      if (!current) return;
      const { status } = await sendTestPush(scope, current.id);
      setMessage(
        status === "sent"
          ? t("testSent")
          : status === "not_configured"
            ? t("notConfigured")
            : t("testFailed"),
      );
    });

  return (
    <div className="grid gap-4">
      {env === "ios" ? (
        <div className="card-warm grid gap-2 rounded-[10px] px-4 py-3.5 text-sm text-[#5b3a1f]">
          <p className="font-semibold">{t("ios.title")}</p>
          <ol className="grid list-decimal gap-1 pl-5">
            <li>{t("ios.step1")}</li>
            <li>{t("ios.step2")}</li>
            <li>{t("ios.step3")}</li>
          </ol>
        </div>
      ) : env === "unsupported" ? (
        <p className="text-muted-foreground text-sm">{t("unsupported")}</p>
      ) : !publicKey ? (
        <p className="text-muted-foreground text-sm">{t("notConfigured")}</p>
      ) : env === "ready" ? (
        current ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold">
                <BellRing className="size-4" aria-hidden /> {t("enabled")}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={test}>
                <Send /> {t("test")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => remove(current.id)}
              >
                {t("disable")}
              </Button>
            </div>
            <fieldset className="grid gap-2">
              <legend className="label-mono mb-1">{t("kindsTitle")}</legend>
              {kindOptions.map((o) => (
                <label key={o.kind} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={current.kinds.includes(o.kind)}
                    disabled={pending}
                    onCheckedChange={(v) => toggleKind(o.kind, v === true)}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground text-sm">{t("off")}</p>
            <Button type="button" disabled={pending} onClick={enable} className="font-bold">
              <BellRing /> {t("enable")}
            </Button>
          </div>
        )
      ) : null}

      {message ? (
        <p role="status" className="text-sm font-medium">
          {message}
        </p>
      ) : null}

      <div className="grid gap-2">
        <h3 className="text-ink text-sm font-semibold">{t("devicesTitle")}</h3>
        {devices.length ? (
          <ul className="bg-card overflow-hidden rounded-[10px] border">
            {devices.map((d) => (
              <li
                key={d.id}
                className="border-line-hair flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-3 text-sm last:border-b-0"
              >
                <Smartphone className="text-muted-foreground size-4" aria-hidden />
                <span className="text-ink font-medium">
                  {d.device || t("unknownDevice")}
                  {d.id === current?.id ? ` (${t("thisDevice")})` : ""}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("added", { date: date(d.createdAt) })}
                  {d.lastSuccessAt ? ` · ${t("lastSuccess", { date: date(d.lastSuccessAt) })}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  disabled={pending}
                  aria-label={t("removeLabel", { device: d.device || t("unknownDevice") })}
                  onClick={() => remove(d.id)}
                >
                  <Trash2 /> {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t("devicesEmpty")}</p>
        )}
      </div>
    </div>
  );
}
