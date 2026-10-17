import { NextResponse, type NextRequest } from "next/server";
import { isPlatformAdmin } from "@/core/auth/session";
import { ADMIN_VIEW_COOKIE } from "@/core/tenant/active";
import { createClient } from "@/lib/supabase/server";

/**
 * "Otvoriť administráciu" of a client (A4): opens in a new tab, the admin works in the client's administration
 * without being a member, a graphite bar says so, and every entry is written to the audit (who, when, which client).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/platform/enter/[id]">) {
  const { id } = await params;
  const { origin } = new URL(request.url);
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await isPlatformAdmin())) {
    return NextResponse.redirect(`${origin}/platform`);
  }
  const supabase = await createClient();
  const { data: tenant } = await supabase.from("tenants").select("id").eq("id", id).maybeSingle();
  if (!tenant) return NextResponse.redirect(`${origin}/platform`);
  await supabase.rpc("write_audit", {
    p_tenant_id: id,
    p_action: "admin.entered",
    p_entity: "tenant",
    p_entity_id: id,
    p_data: {},
  });
  const response = NextResponse.redirect(`${origin}/admin`);
  response.cookies.set(ADMIN_VIEW_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 3600,
  });
  return response;
}
