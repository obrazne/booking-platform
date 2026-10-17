import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { isPlatformAdmin } from "@/core/auth/session";
import { NewTenantForm } from "../forms";

/** Control center — Klienti › Založiť klienta. */
export default async function NewTenantPage() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tn] = await Promise.all([getTranslations("platform"), getTranslations("platform.nav")]);
  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={[{ label: tn("clients"), href: "/platform" }, { label: tn("newClient") }]}
        title={t("newTenant")}
      />
      <PageBody>
        <NewTenantForm />
      </PageBody>
    </div>
  );
}
