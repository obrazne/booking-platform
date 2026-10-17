"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markReported, revealPerson, type Revealed } from "./actions";

/** "Odkryť" — the owner sees the document number and date of birth (audited in the database). */
export function RevealPerson({ id, name }: { id: string; name: string }) {
  const t = useTranslations("modules.checkin.section");
  const locale = useLocale();
  const [data, setData] = useState<Revealed>(null);
  const [pending, start] = useTransition();
  if (data) {
    return (
      <span className="text-ink font-mono text-[13px]" role="status">
        {data.documentNumber ?? "—"}
        {data.birthDate
          ? ` · ${t("born", {
              date: new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
                new Date(`${data.birthDate}T00:00:00Z`),
              ),
            })}`
          : ""}
      </span>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      aria-label={t("revealLabel", { name })}
      onClick={() =>
        start(async () => {
          const r = await revealPerson(id);
          if (r) setData(r);
          else toast.error(t("error"));
        })
      }
    >
      <Eye /> {t("reveal")}
    </Button>
  );
}

/** Marks a foreigner as reported to the police. */
export function MarkReported({ id, reported }: { id: string; reported: boolean }) {
  const t = useTranslations("modules.checkin.section");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markReported(id, !reported);
          if (r.ok) {
            toast.success(t("saved"));
            router.refresh();
          } else toast.error(t("error"));
        })
      }
    >
      {reported ? t("unmarkReported") : t("markReported")}
    </Button>
  );
}
