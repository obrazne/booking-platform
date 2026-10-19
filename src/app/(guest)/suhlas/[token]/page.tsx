import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/core/sections/ui";
import { getTenantFromHost } from "@/core/tenant/current";
import { consentRequestInfo } from "./consent";
import { ConfirmConsent } from "./confirm-consent";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Link from the request for the consent with offers (Z68): the guest confirms with the button — the consent is written
 * only then (source owner_request). Opening the link changes nothing.
 */
export default async function ConsentPage({ params }: PageProps<"/suhlas/[token]">) {
  const { token } = await params;
  const [t, tenant, info] = await Promise.all([
    getTranslations("guests.consentPage"),
    getTenantFromHost(),
    consentRequestInfo(token),
  ]);
  const valid = info && (!tenant || tenant.id === info.tenant_id);
  return (
    <Container className="grid max-w-xl gap-5 py-16">
      {!valid ? (
        <p className="text-lg">{t("invalid")}</p>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("title", { tenant: info.tenant_name })}
          </h1>
          {info.state === "confirmed" ? (
            <p className="text-lg leading-relaxed">{t("done")}</p>
          ) : info.state === "expired" ? (
            <p className="text-lg leading-relaxed">{t("expired")}</p>
          ) : (
            <ConfirmConsent token={token} lead={t("lead", { tenant: info.tenant_name })} />
          )}
        </>
      )}
    </Container>
  );
}
