import { getTranslations } from "next-intl/server";
import { getActiveMembership } from "@/core/tenant/active";
import { toCsv } from "@/lib/csv";
import { queryReservations, reservationListParams, type ReservationStatus } from "../query";

/** CSV of reservations with the list's filters (no paging). Amounts as decimal numbers for spreadsheets. */
export async function GET(request: Request) {
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role))
    return new Response(null, { status: 403 });
  const t = await getTranslations("reservations");
  const tb = await getTranslations("guest.booking");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { rows } = await queryReservations(active.tenantId, reservationListParams(sp), false);
  const csv = toCsv(
    [
      t("number"),
      t("guest"),
      tb("email"),
      t("property"),
      t("stay"),
      "",
      t("status"),
      t("source"),
      t("total"),
      "",
      t("created"),
    ],
    rows.map((r) => [
      r.number,
      r.guest_name,
      r.guest_email,
      r.property?.name ?? "",
      r.items[0]?.check_in ?? "",
      r.items[0]?.check_out ?? "",
      t(`statuses.${r.status as ReservationStatus}`),
      r.source,
      (r.total_cents / 100).toFixed(2).replace(".", ","),
      r.currency,
      r.created_at.slice(0, 10),
    ]),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rezervacie-${active.tenantSlug}.csv"`,
    },
  });
}
