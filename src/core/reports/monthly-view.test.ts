import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/i18n/messages/sk.json";
import {
  duration,
  marketingBalance,
  monthParam,
  reportView,
  shiftMonth,
  type MonthlyReportRaw,
} from "./monthly-view";

const t = createTranslator({ locale: "sk", messages, namespace: "report" }) as unknown as (
  key: string,
  values?: Record<string, string | number>,
) => string;

const base: MonthlyReportRaw = {
  month: "2026-09-01",
  first_month: "2025-03-01",
  commission_bp: 1500,
  minutes: { email: 5, booking: 45, sync: 15, checkin: 30, order: 15 },
  revenue_cents: 630000,
  nights_sold: 9,
  direct_stays: 2,
  portal_stays: 3,
  occupied_nights: 19,
  available_nights: 30,
  saved_cents: 94500,
  saved_ytd_cents: 587000,
  direct_share: 0.4737,
  last_year: {
    revenue_cents: 534000,
    nights_sold: 8,
    occupied_nights: 16,
    available_nights: 30,
    direct_stays: 2,
    direct_share: 0.31,
  },
  channels: { booking: 6, airbnb: 4 },
  contacts: 38,
  contacts_new: 2,
  work: { email: 12, booking: 2, sync: 5, checkin: 2, order: 1 },
  human: { payments: 2, replies: 1, collisions: 0, manual: 0 },
  next: {
    revenue_cents: 140000,
    direct_stays: 1,
    occupied_nights: 9,
    available_nights: 31,
    free_weekends: ["2026-10-09", "2026-10-30"],
  },
  waiting: { unpaid: 0, cancel_requests: 0, collisions: 0, messages: 0 },
};

const nbsp = (s: string) => s.replace(/[  ]/g, " ");

describe("monthly report view (Z62)", () => {
  it("numbers, comparison with last year, savings, work and outlook", () => {
    const v = reportView(base, t, "sk", "EUR");
    expect(nbsp(v.headline)).toBe("Priamo 6 300 €. Bez provízie.");
    expect(nbsp(v.kpis[0]!.value)).toBe("6 300 €");
    expect(v.kpis[0]!.delta).toBe("+18 %");
    expect(v.kpis[1]!.value).toBe("63 %");
    expect(v.kpis[1]!.delta).toBe("+10 b.");
    expect(v.kpis[3]!.value).toBe("5");
    expect(nbsp(v.saved)).toBe("945 €");
    expect(v.savedText).toContain("2 priamych pobytov");
    expect(v.work.map((w) => w.key)).toEqual(["email", "booking", "sync", "checkin", "order"]);
    // 12×5 + 2×45 + 5×15 + 2×30 + 1×15 = 300 min
    expect(v.workMinutes).toBe(300);
    expect(v.workTitle).toBe("5 hodín urobil systém sám.");
    expect(v.human).toBe("Potrebovalo vás: 2 kliky „Platba prijatá“, 1 odpoveď hosťovi.");
    expect(v.channels.map((c) => [c.key, c.nights])).toEqual([
      ["direct", 9],
      ["booking", 6],
      ["airbnb", 4],
    ]);
    expect(v.freeNights).toBe(11);
    expect(v.next.weekends).toBe("9.–11. 10. · 30. 10.–1. 11.");
    expect(v.next.waiting).toBe("Nič");
  });

  it("no direct revenue, no last year, no commission: nothing pretended", () => {
    const v = reportView(
      {
        ...base,
        revenue_cents: 0,
        nights_sold: 0,
        direct_stays: 0,
        saved_cents: 0,
        commission_bp: 0,
        last_year: null,
        direct_share: 0,
        work: { email: 0, booking: 0, sync: 0, checkin: 0, order: 0 },
        human: { payments: 0, replies: 0, collisions: 0, manual: 0 },
      },
      t,
      "sk",
      "EUR",
    );
    expect(v.headline).toBe("Tento mesiac bez priamych pobytov.");
    expect(v.kpis.every((k) => k.delta === null)).toBe(true);
    expect(v.kpis[0]!.note).toBe("minulý rok bez údajov");
    expect(v.kpis[2]!.value).toBe("—");
    expect(v.savedText).toContain("0 %");
    expect(v.work).toEqual([]);
    expect(v.human).toBe("Potrebovalo vás: nič.");
    expect(JSON.stringify(v)).not.toContain("∞");
  });

  it("Z75: the saving as the budget for marketing, what is left, sums since the start", () => {
    expect(marketingBalance(220000, 150000)).toBe(70000);
    expect(marketingBalance(220000, null)).toBeNull();
    expect(marketingBalance(100000, 130000)).toBe(-30000);

    // Martin's example: budget 2 200 €, marketing 1 500 € → +700 €.
    const v = reportView(
      {
        ...base,
        saved_cents: 220000,
        marketing: {
          since: "2025-03-01",
          spent_cents: 150000,
          budget_total_cents: 1200000,
          spent_total_cents: 450000,
        },
      },
      t,
      "sk",
      "EUR",
    );
    expect(nbsp(v.budget.line)).toBe("Váš rozpočet na vlastný marketing tento mesiac: 2 200 €");
    expect(nbsp(v.budget.lineMonth)).toBe(
      "Rozpočet na vlastný marketing za september 2026: 2 200 €",
    );
    expect(nbsp(v.budget.spent!)).toBe("1 500 €");
    expect(nbsp(v.budget.result!)).toBe("Po marketingu ste v pluse 700 € oproti Bookingu.");
    expect(v.budget.total!.label).toBe("Od začiatku (marec 2025)");
    expect(nbsp(v.budget.total!.budget)).toBe("12 000 €");
    expect(nbsp(v.budget.total!.spent)).toBe("4 500 €");
    expect(nbsp(v.budget.total!.balance)).toBe("+7 500 €");

    // More spent than the budget: said plainly, with a minus in the sums.
    const over = reportView(
      {
        ...base,
        saved_cents: 100000,
        marketing: {
          since: "2026-09-01",
          spent_cents: 130000,
          budget_total_cents: 100000,
          spent_total_cents: 130000,
        },
      },
      t,
      "sk",
      "EUR",
    );
    expect(nbsp(over.budget.result!)).toBe(
      "Na marketing ste minuli o 300 € viac, než by si vzal Booking.",
    );
    expect(nbsp(over.budget.total!.balance)).toBe("−300 €");
    expect(over.budget.total!.balanceCents).toBe(-30000);

    // Not filled in / not loaded: no result, no sums.
    const none = reportView(
      {
        ...base,
        marketing: {
          since: "2025-03-01",
          spent_cents: null,
          budget_total_cents: 0,
          spent_total_cents: 0,
        },
      },
      t,
      "sk",
      "EUR",
    );
    expect(none.budget.result).toBeNull();
    expect(none.budget.spent).toBeNull();
    expect(reportView(base, t, "sk", "EUR").budget.total).toBeNull();
  });

  it("months and durations", () => {
    expect(monthParam("2026-09")).toBe("2026-09-01");
    expect(monthParam("2026-13")).toBeNull();
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
    expect(duration(45, t)).toBe("45 min");
    expect(duration(75, t)).toBe("1 h 15 min");
    expect(duration(120, t)).toBe("2 hodiny");
  });
});
