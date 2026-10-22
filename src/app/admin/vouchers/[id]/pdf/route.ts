import { z } from "zod";
import { giftVoucherDocument } from "@/core/gift-vouchers/document";
import { getActiveMembership } from "@/core/tenant/active";

/** Darčekový poukaz as a PDF in the client's design (Z78) — owner and reception. */
export async function GET(_: Request, { params }: RouteContext<"/admin/vouchers/[id]/pdf">) {
  const { id } = await params;
  const active = await getActiveMembership();
  if (!active || !["owner", "reception"].includes(active.role) || !z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const doc = await giftVoucherDocument(active.tenantId, id);
  if (!doc) return new Response(null, { status: 404 });
  return new Response(Buffer.from(doc.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
