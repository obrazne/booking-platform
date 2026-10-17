import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { formatDate } from "@/core/format/format";
import { renderFormPdf } from "@/core/pdf/form-pdf";
import { getActiveMembership } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";

/**
 * Data of a foreigner for the police report (Z36) as a PDF to sign on arrival — owner only; revealing the document
 * is written into the audit by the database. Not the official form of the Ministry (see ROADMAP → Otázky).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/arrivals/report/[guestId]">,
) {
  const { guestId } = await params;
  const active = await getActiveMembership();
  if (!active || active.role !== "owner" || !z.uuid().safeParse(guestId).success) {
    return new Response(null, { status: 404 });
  }
  const supabase = await createClient();
  const { data: secret } = await supabase
    .rpc("reveal_checkin_guest", { p_guest_id: guestId, p_purpose: "report" })
    .maybeSingle();
  if (!secret) return new Response(null, { status: 404 });
  const { data: person } = await supabase
    .rpc("checkin_people_by_id", { p_guest_id: guestId })
    .maybeSingle();
  if (!person) return new Response(null, { status: 404 });
  const [t, td, locale] = await Promise.all([
    getTranslations("modules.checkin.pdf"),
    getTranslations("modules.checkin.section.documents"),
    getLocale(),
  ]);
  const date = (iso: string | null) => (iso ? formatDate(iso, locale) : "");
  const region = (code: string | null) => {
    try {
      return code ? (new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code) : "";
    } catch {
      return code ?? "";
    }
  };
  const pdf = await renderFormPdf({
    title: t("title"),
    subtitle: t("subtitle"),
    sections: [
      {
        heading: t("person"),
        rows: [
          [t("firstName"), person.first_name],
          [t("lastName"), person.last_name],
          [t("birthDate"), date(secret.birth_date)],
          [t("nationality"), region(secret.nationality)],
          [t("documentType"), secret.document_type ? td(secret.document_type as "passport") : ""],
          [t("documentNumber"), secret.document_number ?? ""],
          [t("homeAddress"), secret.address ?? ""],
        ],
      },
      {
        heading: t("accommodation"),
        rows: [
          [t("provider"), person.tenant_name],
          [t("stay"), person.property_name],
          [t("address"), person.property_address],
          [t("from"), date(person.check_in)],
          [t("until"), date(person.check_out)],
        ],
      },
    ],
    signatures: [t("signature"), t("signatureProvider")],
    footer: `${person.reservation_number} · ${t("date")}: ${date(new Date().toISOString().slice(0, 10))}`,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="hlasenie-${person.reservation_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
