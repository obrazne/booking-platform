import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_VIEW_COOKIE } from "@/core/tenant/active";

/** "Späť do riadiaceho centra": ends the admin view of a client. */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/platform`);
  response.cookies.delete(ADMIN_VIEW_COOKIE);
  return response;
}
