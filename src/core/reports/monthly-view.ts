/**
 * Mesačný výpis (Z62, v1.4): from the numbers of the database (`tenant_monthly_report`) to what the page, the PDF and
 * the e-mail show — one place, so the three never differ. Pure: `t` is a translator bound to `report`.
 */

export type MonthlyReportRaw = {
  month: string;
  first_month: string | null;
  commission_bp: number;
  minutes: Partial<Record<WorkKey, number>>;
  revenue_cents: number;
  nights_sold: number;
  direct_stays: number;
  portal_stays: number;
  occupied_nights: number;
  available_nights: number;
  saved_cents: number;
  saved_ytd_cents: number;
  direct_share: number | null;
  last_year: null | {
    revenue_cents: number;
    nights_sold: number;
    occupied_nights: number;
    available_nights: number;
    direct_stays: number;
    direct_share: number | null;
  };
  channels: Record<string, number>;
  contacts: number;
  contacts_new: number;
  work: Record<WorkKey, number>;
  human: Record<HumanKey, number>;
  next: {
    revenue_cents: number;
    direct_stays: number;
    occupied_nights: number;
    available_nights: number;
    free_weekends: string[];
  };
  waiting: Record<WaitingKey, number>;
  /** Z75: own marketing (`tenant_marketing_budget`) — absent where it was not loaded. */
  marketing?: MarketingRaw | null;
};

export type MarketingRaw = {
  /** The first month of the sums ("od začiatku"). */
  since: string;
  /** What the owner spent on marketing in the month; null = not filled in. */
  spent_cents: number | null;
  budget_total_cents: number;
  spent_total_cents: number;
};

/**
 * Z75: the budget for own marketing = the commission saved against the portal (A10). What is left after the
 * marketing: positive = in plus against the portal; null when the spend was not filled in.
 */
export function marketingBalance(budgetCents: number, spentCents: number | null): number | null {
  return spentCents === null ? null : budgetCents - spentCents;
}

export const WORK_KEYS = ["email", "booking", "sync", "checkin", "order"] as const;
export type WorkKey = (typeof WORK_KEYS)[number];
export const DEFAULT_MINUTES: Record<WorkKey, number> = {
  email: 5,
  booking: 45,
  sync: 15,
  checkin: 30,
  order: 15,
};
const HUMAN_KEYS = ["payments", "replies", "collisions", "manual"] as const;
type HumanKey = (typeof HUMAN_KEYS)[number];
const WAITING_KEYS = ["unpaid", "cancel_requests", "collisions", "messages"] as const;
type WaitingKey = (typeof WAITING_KEYS)[number];

type T = (key: string, values?: Record<string, string | number>) => string;

export type ReportView = ReturnType<typeof reportView>;

/** "2026-09" → the first day; anything else → null. */
export function monthParam(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? `${v}-01` : null;
}

export function shiftMonth(first: string, n: number): string {
  const [y, m] = first.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** "5 h 15 min", "45 min", "0 min". */
export function duration(minutes: number, t: T): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t("duration.hm", { h, m });
  if (h) return t("duration.h", { h });
  return t("duration.m", { m });
}

export function reportView(raw: MonthlyReportRaw, t: T, locale: string, currency: string) {
  const whole = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Math.round(cents / 100));
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const monthName = (iso: string, style: "long" | "short" = "long") =>
    new Intl.DateTimeFormat(locale, {
      month: style,
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  const monthOnly = (iso: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const ly = raw.last_year;
  const lyMonth = shiftMonth(raw.month, -12);
  const change = (now: number, before: number) =>
    before > 0 ? Math.round(((now - before) / before) * 100) : null;
  const signed = (n: number, unit: string) =>
    `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} ${unit}`;
  const occupancy = raw.available_nights ? raw.occupied_nights / raw.available_nights : 0;
  const lyOccupancy = ly && ly.available_nights ? ly.occupied_nights / ly.available_nights : null;
  const avg = raw.nights_sold ? raw.revenue_cents / raw.nights_sold : null;
  const lyAvg = ly && ly.nights_sold ? ly.revenue_cents / ly.nights_sold : null;
  const vs = t("vsLastYear", { month: monthName(lyMonth, "short") });
  const delta = (d: number | null, unit = "%") => (d === null ? null : signed(d, unit));

  const kpis = [
    {
      key: "revenue",
      label: t("kpi.revenue"),
      value: whole(raw.revenue_cents),
      delta: ly ? delta(change(raw.revenue_cents, ly.revenue_cents)) : null,
      note: ly ? vs : t("noLastYear"),
    },
    {
      key: "occupancy",
      label: t("kpi.occupancy"),
      value: pct(occupancy),
      delta:
        lyOccupancy !== null
          ? signed(Math.round((occupancy - lyOccupancy) * 100), t("points"))
          : null,
      note: t("occupancyNote", { occupied: raw.occupied_nights, available: raw.available_nights }),
    },
    {
      key: "avg",
      label: t("kpi.avg"),
      value: avg === null ? "—" : whole(avg),
      delta: avg !== null && lyAvg ? delta(change(avg, lyAvg)) : null,
      note: t("avgNote"),
    },
    {
      key: "stays",
      label: t("kpi.stays"),
      value: String(raw.direct_stays + raw.portal_stays),
      delta: null,
      note: t("staysNote", { direct: raw.direct_stays, portal: raw.portal_stays }),
    },
  ];

  const minutes = { ...DEFAULT_MINUTES, ...raw.minutes };
  const work = WORK_KEYS.filter((k) => raw.work[k] > 0).map((k) => ({
    key: k,
    what: t(`work.${k}`, { count: raw.work[k] }),
    detail: t(`work.${k}Detail`),
    minutes: raw.work[k] * minutes[k],
    time: duration(raw.work[k] * minutes[k], t),
  }));
  const workMinutes = work.reduce((s, w) => s + w.minutes, 0);
  const human = HUMAN_KEYS.filter((k) => raw.human[k] > 0).map((k) =>
    t(`human.${k}`, { count: raw.human[k] }),
  );

  const channelNights = [
    { key: "direct", name: t("channel.direct"), nights: raw.nights_sold },
    { key: "booking", name: "Booking", nights: raw.channels.booking ?? 0 },
    { key: "airbnb", name: "Airbnb", nights: raw.channels.airbnb ?? 0 },
    { key: "other", name: t("channel.other"), nights: raw.channels.other ?? 0 },
  ].filter((c) => c.nights > 0);
  const free = Math.max(0, raw.available_nights - raw.occupied_nights);

  const nextMonth = shiftMonth(raw.month, 1);
  const weekend = (friday: string) => {
    const f = new Date(`${friday}T00:00:00Z`);
    const s = new Date(f.getTime() + 2 * 86_400_000);
    return f.getUTCMonth() === s.getUTCMonth()
      ? `${f.getUTCDate()}.–${s.getUTCDate()}. ${s.getUTCMonth() + 1}.`
      : `${f.getUTCDate()}. ${f.getUTCMonth() + 1}.–${s.getUTCDate()}. ${s.getUTCMonth() + 1}.`;
  };
  const waiting = WAITING_KEYS.filter((k) => raw.waiting[k] > 0).map((k) =>
    t(`waiting.${k}`, { count: raw.waiting[k] }),
  );
  const commission = `${(raw.commission_bp / 100).toLocaleString(locale)} %`;
  const signedMoney = (cents: number) =>
    `${cents > 0 ? "+" : cents < 0 ? "−" : "±"}${whole(Math.abs(cents))}`;
  const mk = raw.marketing ?? null;
  const balance = mk ? marketingBalance(raw.saved_cents, mk.spent_cents) : null;
  const totalBalance = mk ? mk.budget_total_cents - mk.spent_total_cents : 0;

  return {
    month: raw.month,
    monthLabel: monthName(raw.month),
    monthOnly: monthOnly(raw.month),
    hasRevenue: raw.revenue_cents > 0,
    revenue: whole(raw.revenue_cents),
    headline:
      raw.revenue_cents > 0
        ? t("headline", { revenue: whole(raw.revenue_cents) })
        : t("headlineNone"),
    kpis,
    saved: whole(raw.saved_cents),
    savedYtd: whole(raw.saved_ytd_cents),
    savedText:
      raw.commission_bp === 0
        ? t("savedNoCommission")
        : raw.direct_stays > 0
          ? t("savedText", { count: raw.direct_stays, commission })
          : t("savedNone"),
    ytdLabel: t("sinceJanuary", { year: raw.month.slice(0, 4) }),
    // Z75: the saving as the budget for own marketing and what is left after the marketing.
    budget: {
      title: t("budgetTitle"),
      line: t("budgetLine", { amount: whole(raw.saved_cents) }),
      lineMonth: t("budgetMonth", { month: monthName(raw.month), amount: whole(raw.saved_cents) }),
      spentCents: mk?.spent_cents ?? null,
      spent: mk?.spent_cents != null ? whole(mk.spent_cents) : null,
      balanceCents: balance,
      result:
        balance === null
          ? null
          : balance > 0
            ? t("budgetPlus", { amount: whole(balance) })
            : balance < 0
              ? t("budgetMinus", { amount: whole(-balance) })
              : t("budgetEven"),
      total: mk
        ? {
            label: t("sinceStart", { month: monthName(mk.since) }),
            budget: whole(mk.budget_total_cents),
            spent: whole(mk.spent_total_cents),
            balance: signedMoney(totalBalance),
            balanceCents: totalBalance,
          }
        : null,
    },
    commission,
    directShare:
      raw.direct_share === null
        ? null
        : ly?.direct_share !== null && ly?.direct_share !== undefined
          ? t("shareWithLastYear", {
              share: pct(raw.direct_share),
              month: monthName(lyMonth, "short"),
              before: pct(ly.direct_share),
            })
          : pct(raw.direct_share),
    contacts: t("contactsValue", { count: raw.contacts, added: raw.contacts_new }),
    workTitle: t("workTitle", { time: duration(workMinutes, t) }),
    workMinutes,
    work,
    human: human.length ? t("humanList", { list: human.join(", ") }) : t("humanNone"),
    channelsTitle: t("channelsTitle", { sold: raw.occupied_nights, total: raw.available_nights }),
    channels: channelNights,
    freeNights: free,
    next: {
      month: monthOnly(nextMonth),
      revenueValue: whole(raw.next.revenue_cents),
      title: t("nextTitle", { month: monthOnly(nextMonth) }),
      revenue: t("nextRevenue", { revenue: whole(raw.next.revenue_cents) }),
      detail: t("nextDetail", {
        count: raw.next.direct_stays,
        occupancy: pct(
          raw.next.available_nights ? raw.next.occupied_nights / raw.next.available_nights : 0,
        ),
      }),
      weekends: raw.next.free_weekends.length
        ? raw.next.free_weekends.map(weekend).join(" · ")
        : t("noWeekends"),
      waiting: waiting.length ? waiting.join(", ") : t("waitingNone"),
      waitingNone: waiting.length === 0,
    },
    note: t("note", { month: monthOnly(raw.month), commission }),
  };
}
