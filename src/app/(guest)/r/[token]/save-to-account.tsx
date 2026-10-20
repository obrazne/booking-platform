import { getTranslations } from "next-intl/server";
import { startAccountFromReservation } from "@/core/guest/auth";

/** The row on top of a paid stay opened through the access link (Z49, v2.4): save it to the guest account. */
export async function SaveToAccount({ token }: { token: string }) {
  const t = await getTranslations("guest.stay.saveToAccount");
  return (
    <form
      action={startAccountFromReservation.bind(null, token)}
      className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
    >
      <span className="max-w-[60ch]">{t("text")}</span>
      <button
        type="submit"
        className="border-line text-ink inline-flex min-h-10 items-center rounded-full border bg-white px-4 font-medium hover:bg-[var(--hover-row)]"
      >
        {t("cta")}
      </button>
    </form>
  );
}
