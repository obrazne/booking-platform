import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { frameAncestors } from "@/core/widget/sites";

const PROTECTED_PREFIXES = ["/admin", "/platform"];

/** Refreshes the Supabase session cookie and redirects anonymous users away from protected areas. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (
    !isSignedIn &&
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // Widget pages (Z83): in a frame only on the websites the client allowed; no session, no cookies.
  if (pathname.startsWith("/embed/")) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const { data: sites } = await supabase.rpc("widget_sites_by_host", {
      p_host:
        process.env.NODE_ENV !== "production" && process.env.DEV_TENANT_HOST
          ? process.env.DEV_TENANT_HOST
          : host,
    });
    response.headers.set("Content-Security-Policy", frameAncestors(sites ?? []));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
