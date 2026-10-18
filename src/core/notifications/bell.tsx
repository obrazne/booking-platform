"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bell,
  CalendarX,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ConciergeBell,
  DatabaseBackup,
  MessageCircle,
  Plus,
  RefreshCw,
  Star,
  Undo2,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadBell, markNotificationsRead } from "./actions";
import { notificationText } from "./text";
import type { BellData, BellScope, NotificationItem } from "./types";

const ICONS: Record<string, { icon: LucideIcon; tone: "accent" | "warn" | "neutral" }> = {
  reservation_new: { icon: Plus, tone: "accent" },
  payment_due: { icon: Clock, tone: "warn" },
  payment_received: { icon: CheckCircle2, tone: "accent" },
  cancel_request: { icon: Undo2, tone: "warn" },
  reservation_cancelled: { icon: X, tone: "neutral" },
  portal_booking: { icon: RefreshCw, tone: "neutral" },
  calendar_conflict: { icon: CalendarX, tone: "warn" },
  sync_failed: { icon: AlertTriangle, tone: "warn" },
  trial_ending: { icon: Clock, tone: "neutral" },
  client_sync_failed: { icon: AlertTriangle, tone: "warn" },
  client_emails_failed: { icon: AlertTriangle, tone: "warn" },
  client_trial_ending: { icon: Clock, tone: "neutral" },
  client_new: { icon: Plus, tone: "accent" },
  review_new: { icon: Star, tone: "accent" },
  review_publishing: { icon: Clock, tone: "neutral" },
  order_new: { icon: ConciergeBell, tone: "accent" },
  order_awaiting: { icon: ConciergeBell, tone: "warn" },
  checkin_completed: { icon: ClipboardCheck, tone: "accent" },
  foreigner_unreported: { icon: AlertTriangle, tone: "warn" },
  account_deletion: { icon: UserX, tone: "warn" },
  message_new: { icon: MessageCircle, tone: "accent" },
  backup_stale: { icon: DatabaseBackup, tone: "warn" },
};

const TONE = {
  accent: "bg-[color-mix(in_srgb,var(--primary)_12%,white)] text-primary",
  warn: "bg-[#f6ecdf] text-[#8a4a22]",
  neutral: "bg-[#eef0f3] text-[#3b4652]",
};

/**
 * Bell (v1.2) in the header of every page of the administration and the control center: badge with unread count,
 * list 420 px (full screen on a phone), click = read + open the target, "mark all as read". The count is reloaded on
 * navigation (no realtime). `media` limits the instance to the phone or computer header, so only one loads.
 */
export function NotificationBell({
  scope,
  initial,
  settingsHref,
  media,
}: {
  scope: BellScope;
  initial: BellData;
  settingsHref?: string;
  media: "mobile" | "desktop";
}) {
  const t = useTranslations("notifications");
  const tAll = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState(false);
  // Time of opening the list, for "before 5 min" (not read during render).
  const [now, setNow] = useState(0);
  const [, startTransition] = useTransition();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Bumped on every local change, so an older reload cannot bring back what was just marked as read.
  const version = useRef(0);

  const visible = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(media === "mobile" ? "(max-width: 767px)" : "(min-width: 768px)").matches,
    [media],
  );

  // Fresh count after each navigation (the layout itself is not re-rendered between pages).
  useEffect(() => {
    if (!visible()) return;
    let alive = true;
    const started = version.current;
    loadBell(scope)
      .then((d) => {
        if (alive && started === version.current) setData(d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname, scope, visible]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const markRead = (ids: string[]) => {
    version.current += 1;
    setData((d) => {
      const items = d.items.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i));
      return { items, unread: items.filter((i) => !i.read).length };
    });
    startTransition(() => void markNotificationsRead(ids));
  };

  const ago = (iso: string) => {
    const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
    if (minutes < 60) return t("minutesAgo", { count: Math.max(minutes, 1) });
    if (minutes < 24 * 60) return t("hoursAgo", { count: Math.round(minutes / 60) });
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" }).format(
      new Date(iso),
    );
  };
  const text = (n: NotificationItem) => notificationText(n, t as never, tAll as never, locale);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => {
          setNow(Date.now());
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={data.unread ? t("labelUnread", { count: data.unread }) : t("label")}
        className={cn(
          "text-ink border-line relative inline-flex size-10 items-center justify-center rounded-full border transition-colors",
          open ? "bg-muted" : "bg-background hover:bg-muted",
        )}
      >
        <Bell className="size-[18px]" />
        {data.unread ? (
          <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c2552d] px-1 text-[11px] font-bold text-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("title")}
          className="bg-background text-ink fixed inset-0 z-50 flex flex-col md:absolute md:inset-auto md:top-12 md:right-0 md:max-h-[min(640px,calc(100vh-120px))] md:w-[420px] md:rounded-[10px] md:border md:shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b px-[18px] py-3.5">
            <h2 className="text-base font-bold">{t("title")}</h2>
            {data.unread ? (
              <button
                type="button"
                onClick={() => markRead(data.items.filter((i) => !i.read).map((i) => i.id))}
                className="text-primary ml-auto text-[13px] font-bold"
              >
                {t("readAll")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full md:hidden",
                !data.unread && "ml-auto",
              )}
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {data.items.length ? (
              data.items.map((n) => {
                const { icon: Icon, tone } = ICONS[n.kind] ?? { icon: Bell, tone: "neutral" };
                const { title, body } = text(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) markRead([n.id]);
                        setOpen(false);
                        if (n.target) router.push(n.target);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-[#f0efea] px-[18px] py-3.5 text-left",
                        n.read ? "bg-background" : "bg-[#fbfaf6]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex size-[30px] shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
                          TONE[tone],
                        )}
                      >
                        <Icon />
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className={cn("text-sm", n.read ? "font-medium" : "font-bold")}>
                          {title}
                          {n.read ? null : <span className="sr-only"> ({t("unread")})</span>}
                        </span>
                        <span className="text-muted-foreground text-[13px]">{body}</span>
                        <span className="text-muted-foreground text-xs">{ago(n.createdAt)}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          n.read ? "bg-transparent" : "bg-[#c2552d]",
                        )}
                      />
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="text-muted-foreground px-[18px] py-10 text-center text-sm">
                {t("empty")}
              </li>
            )}
          </ul>
          {settingsHref ? (
            <p className="text-muted-foreground border-t px-[18px] py-3 text-[13px]">
              {t("footer")}{" "}
              <Link
                href={settingsHref}
                onClick={() => setOpen(false)}
                className="text-ink font-bold underline underline-offset-2"
              >
                {t("footerLink")}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
