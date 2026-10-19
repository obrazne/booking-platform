import type { ReportView } from "@/core/reports/monthly-view";
import { emailLayout, esc, guestFrame, paragraph } from "./layout";
import type { OutgoingEmail } from "./send";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * The e-mail of the monthly report (Z62, doska 13): subject with revenue and savings, the page in short, the PDF in the
 * attachment and "Otvoriť celý výpis". Pure HTML from the same view as the page.
 */
export function renderMonthlyReportEmail(o: {
  view: ReportView;
  t: T;
  accent: string;
  tenantName: string;
  firstName: string | null;
  to: string;
  link: string;
  pdf: Uint8Array;
}): OutgoingEmail {
  const { view: v, t } = o;
  const subject = v.hasRevenue
    ? t("emailSubject", { month: v.monthOnly, revenue: v.revenue, saved: v.saved })
    : t("emailSubjectNone", { month: v.monthOnly });
  const greeting = o.firstName
    ? t("emailGreeting", { name: o.firstName, month: v.monthOnly })
    : t("emailGreetingNoName", { month: v.monthOnly });
  const kpi = (key: string) => v.kpis.find((k) => k.key === key)!;
  const rows: [string, string][] = [
    [t("emailOccupancy"), `${kpi("occupancy").value} · ${kpi("occupancy").note}`],
    [t("emailAvg"), kpi("avg").value],
    [t("emailStays"), kpi("stays").note],
    ...(v.work.length ? [[t("emailWork"), v.workTitle] as [string, string]] : []),
  ];
  const table = `<table role="presentation" width="100%" style="margin:8px 0 18px;border-top:1px solid #e9e5db" cellpadding="0" cellspacing="0">${rows
    .map(
      ([k, val]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e9e5db;color:#6e6e73">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e9e5db;text-align:right">${esc(val)}</td></tr>`,
    )
    .join("")}</table>`;
  const savedBox = `<div style="margin:0 0 18px;padding:16px 18px;border-radius:14px;background:#eef3f0"><p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5a6672">${esc(t("savedTitle"))}</p><p style="margin:0 0 6px;font-size:28px;font-weight:800;color:${esc(o.accent)}">${esc(v.saved)}</p><p style="margin:0;color:#3b3d42">${esc(
    [
      t("emailSaved", { ytd: v.savedYtd }),
      v.directShare ? t("emailShare", { share: v.directShare }) : "",
    ]
      .filter(Boolean)
      .join(" "),
  )}</p></div>`;
  const outlook = t("emailOutlook", {
    month: v.next.month,
    revenue: v.next.revenueValue,
    weekends: v.next.weekends,
  });
  const foot = t("emailFoot", { commission: v.commission });
  const html = emailLayout(
    o.accent,
    v.headline,
    [paragraph(greeting), savedBox, table, paragraph(v.human), paragraph(outlook)],
    { href: o.link, label: t("emailButton") },
    {
      ...guestFrame({
        accent: o.accent,
        name: `${o.tenantName} · ${t("title")}`,
        labels: { questions: "", myStay: "", whatsapp: "" },
      }),
      footer: `<p style="margin:0;color:#6e6e73;font-size:13px">${esc(foot)}</p>`,
    },
  );
  return {
    to: o.to,
    subject,
    fromName: o.tenantName,
    html,
    text: [
      greeting,
      v.headline,
      `${t("savedTitle")}: ${v.saved}`,
      ...rows.map((r) => r.join(": ")),
      v.human,
      outlook,
      o.link,
      foot,
    ].join("\n\n"),
    attachments: [
      {
        filename: `vypis-${v.month.slice(0, 7)}.pdf`,
        content: Buffer.from(o.pdf).toString("base64"),
      },
    ],
  };
}
