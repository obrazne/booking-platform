"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendReportToAccountant } from "./actions";

/** "Poslať účtovníkovi" (Z62): the PDF by e-mail; without the accountant's e-mail it leads to the settings. */
export function AccountantButton({ month, email }: { month: string; email: string | null }) {
  const t = useTranslations("report");
  const [pending, start] = useTransition();
  if (!email)
    return (
      <Button asChild variant="outline">
        <Link href="/admin/settings#vypis">
          <Send /> {t("accountantSetup")}
        </Link>
      </Button>
    );
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await sendReportToAccountant(month);
          if (r.ok) toast.success(t("accountantSent", { email: r.email ?? email }));
          else toast.error(t("accountantFailed"));
        })
      }
    >
      <Send /> {t("accountant")}
    </Button>
  );
}
