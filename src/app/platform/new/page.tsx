import { getTranslations } from "next-intl/server";
import { isPlatformAdmin } from "@/core/auth/session";
import { NewTenantForm } from "../forms";

export default async function NewTenantPage() {
  if (!(await isPlatformAdmin())) return null;
  const t = await getTranslations("platform");
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("newTenant")}</h1>
      <NewTenantForm />
    </div>
  );
}
