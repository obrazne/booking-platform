import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { formatDate } from "@/core/format/format";
import { Container } from "@/core/sections/ui";
import { rulesFor } from "../rules";
import { CheckinForm } from "./form";
import type { GuestCheckin } from "./load";

/**
 * Online check-in screen (Z39, design `Checkin`): a card per person, arrival time, consent with the house rules and
 * "Dokončiť check-in"; on the right why we ask and what happens after. Done: "Hotovo. Na mieste už len kľúče."
 */
export async function CheckinScreen({
  data,
  token,
  locale,
  backHref,
  done,
  crumbs,
}: {
  /** Breadcrumbs of the guest account (Z43) — they replace the "back" link. */
  crumbs?: React.ReactNode;
  data: GuestCheckin;
  token?: string;
  locale: string;
  backHref: string;
  done: boolean;
}) {
  const t = await getTranslations("modules.checkin.guest");
  const r = data.reservation;
  const rules = rulesFor(data.country);
  const header = (
    <div className="border-line border-b">
      <Container className="flex items-center justify-between gap-4 py-[18px]">
        <span className="flex items-baseline gap-3.5">
          <span className="text-ink text-lg font-extrabold tracking-tight">{r.propertyName}</span>
          <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-[#6b7480] uppercase">
            {t("kicker")}
          </span>
        </span>
        {crumbs ? null : (
          <Link href={backHref} className="text-sm text-[#5a6672] hover:text-[#11212f]">
            {t("back")}
          </Link>
        )}
      </Container>
      {crumbs ? <Container className="pb-4">{crumbs}</Container> : null}
    </div>
  );

  if (done) {
    return (
      <main>
        {header}
        <Container className="grid max-w-[720px] justify-items-start gap-5 py-16">
          <span className="bg-primary text-primary-foreground inline-flex size-12 items-center justify-center rounded-full">
            <Check className="size-6" strokeWidth={2.2} />
          </span>
          <h1 className="font-heading text-ink text-[34px] leading-tight font-extrabold tracking-tight sm:text-[40px]">
            {t("doneTitle")} <span className="text-ink-soft">{t("doneTitle2")}</span>
          </h1>
          <p className="max-w-[60ch] text-[17px] leading-relaxed text-[#3b3d42]">
            {data.required_for_instructions
              ? t("doneUnlock", { date: formatDate(data.instructionsFrom, locale) })
              : t("doneText")}{" "}
            {data.editable ? t("editUntil") : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={backHref}
              className="inline-flex min-h-12 items-center rounded-full bg-[#2b3036] px-6 text-[15px] font-bold text-white hover:bg-[#0c0e11]"
            >
              {t("backToStay")}
            </Link>
            {data.editable && data.window === "ok" ? (
              <Link
                href="?upravit=1"
                className="border-line text-ink inline-flex min-h-12 items-center rounded-full border bg-white px-6 text-[15px] font-medium"
              >
                {t("editData")}
              </Link>
            ) : null}
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      {header}
      <Container className="grid items-start gap-10 pt-10 pb-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="grid min-w-0 gap-8">
          <div className="grid gap-2.5">
            <span className="font-mono text-xs tracking-[0.08em] text-[#5a6672] uppercase">
              {r.number} · {formatDate(r.checkIn, locale)} – {formatDate(r.checkOut, locale)} ·{" "}
              {t("persons", { count: r.persons })}
            </span>
            <h1 className="font-heading text-ink text-[32px] leading-[1.1] font-extrabold tracking-tight sm:text-[38px]">
              {t("title")} <span className="text-ink-soft">{t("title2")}</span>
            </h1>
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-[#5a6672]">{t("intro")}</p>
          </div>
          {data.window === "ok" ? (
            <CheckinForm
              reservationId={r.id}
              token={token}
              locale={locale}
              expected={data.expected}
              guestName={r.guestName}
              persons={data.persons}
              arrivalTime={data.arrival_time}
              checkInFrom={data.check_in_from}
              houseRulesAccepted={data.house_rules_accepted}
              houseRulesUrl={data.houseRulesUrl}
              documentTypes={[...rules.documentTypes]}
              doneHref={`${backHref}`}
            />
          ) : (
            <p className="text-ink text-[15px]">
              {data.window === "not_open" && data.opens_on
                ? t("opensOn", { date: formatDate(data.opens_on, locale) })
                : t("closedText")}
            </p>
          )}
        </div>
        <aside className="grid content-start gap-4 lg:sticky lg:top-6">
          <div className="grid gap-2.5 rounded-[10px] border border-[#ecebe6] bg-[#fafaf8] px-5 py-[18px]">
            <span className="text-ink text-[15px] font-bold">{t("whyTitle")}</span>
            <p className="text-sm leading-relaxed text-[#5a6672]">{t("whyText")}</p>
            <p className="text-sm leading-relaxed text-[#5a6672]">
              {t("whyPrivacy", { name: data.ownerName ?? "none" })}
            </p>
          </div>
          <div className="border-line grid gap-2.5 rounded-[10px] border px-5 py-[18px]">
            <span className="text-ink text-[15px] font-bold">{t("afterTitle")}</span>
            {[
              data.required_for_instructions
                ? t("after1", { days: data.arrivalDays })
                : t("after1Plain", { days: data.arrivalDays }),
              t("after2"),
              t("after3"),
            ].map((line) => (
              <span key={line} className="flex items-start gap-2 text-sm text-[#3b3d42]">
                <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={2.2} />
                {line}
              </span>
            ))}
          </div>
        </aside>
      </Container>
    </main>
  );
}
