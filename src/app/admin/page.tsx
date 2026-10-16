import { getTranslations } from "next-intl/server";
import { getMemberships } from "@/core/auth/session";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

export default async function AdminHome() {
  const t = await getTranslations();
  const memberships = await getMemberships();

  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 p-8">
      {memberships.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.noMembership")}</p>
      ) : (
        <ul className="grid gap-2">
          {memberships.map((m) => (
            <li key={m.tenantId}>{m.tenantName}</li>
          ))}
        </ul>
      )}
      <form action={signOut}>
        <Button variant="outline" type="submit">
          {t("common.signOut")}
        </Button>
      </form>
    </main>
  );
}
