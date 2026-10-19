import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "@/i18n/messages/sk.json";
import { reportView, type MonthlyReportRaw } from "@/core/reports/monthly-view";
import { renderMonthlyReportEmail } from "./monthly-report-email";

type T = (key: string, values?: Record<string, string | number>) => string;
const t = createTranslator({ locale: "sk", messages, namespace: "report" }) as unknown as T;

const raw: MonthlyReportRaw = {
  month: "2026-09-01",
  first_month: "2025-03-01",
  commission_bp: 1500,
  minutes: {},
  revenue_cents: 630000,
  nights_sold: 9,
  direct_stays: 2,
  portal_stays: 3,
  occupied_nights: 19,
  available_nights: 30,
  saved_cents: 94500,
  saved_ytd_cents: 587000,
  direct_share: 0.47,
  last_year: null,
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
    free_weekends: ["2026-10-09", "2026-10-23"],
  },
  waiting: { unpaid: 0, cancel_requests: 0, collisions: 0, messages: 0 },
};

describe("monthly report e-mail (Z62, doska 13)", () => {
  it("subject with revenue and savings, the page in short, PDF attached — HTML snapshot", () => {
    const mail = renderMonthlyReportEmail({
      view: reportView(raw, t, "sk", "EUR"),
      t,
      accent: "#2f5d50",
      tenantName: "Chalet STRÖMY",
      firstName: "Jana",
      to: "jana@example.invalid",
      link: "https://app.example.invalid/admin/statistics/report?month=2026-09",
      pdf: new Uint8Array([37, 80, 68, 70]),
    });
    const nb = (s: string) => s.replace(/[  ]/g, " ");
    expect(nb(mail.subject)).toBe("Váš september: 6 300 € priamo, 945 € ušetrených na províziách");
    expect(mail.html).toContain("Dobrý deň, Jana, takto vyzeral september:");
    expect(mail.html).toContain("Otvoriť celý výpis");
    expect(nb(mail.text)).toContain("V mesiaci október máte zatiaľ 1 400 € potvrdených.");
    expect(mail.attachments).toEqual([{ filename: "vypis-2026-09.pdf", content: "JVBERg==" }]);
    expect(mail.html).toMatchSnapshot();
  });

  it("without direct revenue the subject does not pretend", () => {
    const mail = renderMonthlyReportEmail({
      view: reportView(
        { ...raw, revenue_cents: 0, saved_cents: 0, nights_sold: 0 },
        t,
        "sk",
        "EUR",
      ),
      t,
      accent: "#2f5d50",
      tenantName: "Chalet STRÖMY",
      firstName: null,
      to: "jana@example.invalid",
      link: "#",
      pdf: new Uint8Array(),
    });
    expect(mail.subject).toBe("Váš september: mesačný výpis");
    expect(mail.html).toContain("Tento mesiac bez priamych pobytov.");
  });
});
