import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LOGIN_EMAIL_COOKIE } from "@/core/guest/constants";
import { Container, Heading } from "@/core/sections/ui";
import { getTenantFromHost } from "@/core/tenant/current";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prihlásenie" };

/** Passwordless login of a guest with a code from e-mail (B10). */
export default async function GuestLoginPage() {
  const tenant = await getTenantFromHost();
  if (!tenant) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    const { data: guestId } = await supabase.rpc("current_guest_id", { p_tenant_id: tenant.id });
    if (guestId) redirect("/ucet");
  }
  const t = await getTranslations("guest.account");
  const pending = Boolean((await cookies()).get(LOGIN_EMAIL_COOKIE)?.value);
  return (
    <Container className="grid max-w-md gap-8 py-16 sm:py-24">
      <Heading
        size="md"
        as="h1"
        kicker={t("loginKicker")}
        title={t("loginTitle")}
        subtitle={t("loginSubtitle")}
      />
      <LoginForm initialStep={pending ? "code" : "email"} />
    </Container>
  );
}
