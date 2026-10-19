import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTenant } from "@/core/admin/action";
import { PanelSection, PanelSummary, type PanelContent } from "@/core/admin/record-panel";
import { loadGuestCard } from "@/core/guests/query";
import { formatDate, formatMoney } from "@/core/format/format";
import { money } from "@/core/money/money";
import { isModuleEnabled } from "@/core/modules/registry";
import { getTenantInfo } from "@/core/tenant/info";
import { ConsentActions, ContactEdit, NoteForm } from "./card-forms";

/**
 * Karta hosťa (Z68, v1.6, doska 17): contact (the owner edits it; the address with who filled it in and when), consents
 * with their history (revoke in the guest's name, or send a request — never switch on), stays with links to the
 * reservations, the team's note; Napísať správu · Nová rezervácia · Údaje hosťa (export for a request of access).
 */
export async function guestPanel(id: string): Promise<PanelContent> {
  const active = await requireTenant();
  const [t, tr, locale, tenant, card, messages] = await Promise.all([
    getTranslations("guests.card"),
    getTranslations("reservations"),
    getLocale(),
    getTenantInfo(active.tenantId),
    loadGuestCard(id),
    isModuleEnabled(active.tenantId, "messages"),
  ]);
  if (!card || card.guest.tenant_id !== active.tenantId)
    return { body: <p className="text-muted-foreground text-sm">{t("failed")}</p> };
  const { guest, events, stays, note, requestBlock } = card;
  const date = (d: string) => formatDate(d.slice(0, 10), locale, "short");
  const region = (c: string) =>
    new Intl.DisplayNames([locale], { type: "region" }).of(c.toUpperCase()) ?? c;
  const language = (c: string) => new Intl.DisplayNames([locale], { type: "language" }).of(c) ?? c;
  const counted = stays.filter((s) => s.status !== "cancelled" && s.status !== "expired");
  const atBooking = [...stays].reverse().find((s) => s.consentAtBooking);
  const tags = [
    counted.length >= 2 ? t("tags.returning", { count: counted.length }) : null,
    guest.marketing_consent ? t("tags.consent") : null,
    guest.source === "manual" ? t("tags.manual") : counted.length <= 1 ? t("tags.new") : null,
  ].filter((x): x is string => Boolean(x));
  const blockText =
    requestBlock === "recent" && guest.consent_requested_at
      ? t("block.recent", { date: date(guest.consent_requested_at) })
      : requestBlock
        ? t(`block.${requestBlock as "revoked"}`)
        : null;
  const rows: { k: string; v: string; muted?: boolean }[] = [
    { k: t("fields.email"), v: guest.email },
    { k: t("fields.phone"), v: guest.phone ?? "—", muted: !guest.phone },
    { k: t("countryShort"), v: guest.country ? region(guest.country) : "—", muted: !guest.country },
    {
      k: t("languageShort"),
      v: guest.language ? language(guest.language) : "—",
      muted: !guest.language,
    },
    {
      k: t("fields.address"),
      v: guest.address
        ? `${guest.address}${
            guest.address_source && guest.address_updated_at
              ? ` · ${t(`addressSource.${guest.address_source as "owner"}`)} ${date(guest.address_updated_at)}`
              : ""
          }`
        : t("addressUnknown"),
      muted: !guest.address,
    },
  ];
  const latest = counted[0] ?? stays[0];
  const newHref = `/admin/reservations/new?${new URLSearchParams({
    guest_email: guest.email,
    ...(guest.name ? { guest_name: guest.name } : {}),
    ...(guest.phone ? { guest_phone: guest.phone } : {}),
  })}`;

  return {
    label: guest.name || guest.email,
    header: <span className="text-ink font-mono text-[13px] font-medium">{t("label")}</span>,
    body: (
      <div className="grid gap-6">
        <PanelSummary
          title={guest.name || guest.email}
          subtitle={guest.name ? guest.email : undefined}
        >
          <span className="flex flex-wrap gap-1.5">
            {tags.map((x) => (
              <span
                key={x}
                className="rounded-full bg-[#e6efeb] px-2.5 py-0.5 text-xs font-bold text-[#2f5d50]"
              >
                {x}
              </span>
            ))}
          </span>
        </PanelSummary>

        <ContactEdit guest={guest}>
          <dl className="grid">
            {rows.map((r) => (
              <div
                key={r.k}
                className="border-hair grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b py-2 text-sm last:border-b-0"
              >
                <dt className="text-[#5a6672]">{r.k}</dt>
                <dd className={r.muted ? "text-[#5a6672]" : "text-ink [overflow-wrap:anywhere]"}>
                  {r.v}
                </dd>
              </div>
            ))}
          </dl>
        </ContactEdit>

        <PanelSection label={t("consents")}>
          <p className="text-ink text-sm leading-relaxed">
            {guest.marketing_consent
              ? `${t("consentOn", { date: date(guest.marketing_consent_at ?? guest.created_at) })}${
                  atBooking ? ` ${t("consentAtBooking", { number: atBooking.number })}` : ""
                }`
              : t("consentOff")}
          </p>
          {events.length ? (
            <ul className="grid gap-0.5 text-[13px] text-[#5a6672]">
              {events.map((e, i) => (
                <li key={i}>
                  {date(e.created_at)} · {e.granted ? t("granted") : t("revoked")}
                  {t.has(`sources.${e.source}` as never)
                    ? ` ${t(`sources.${e.source}` as never)}`
                    : ""}
                  {e.reason ? ` · ${t("reason", { reason: e.reason })}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <ConsentActions
            id={guest.id}
            email={guest.email}
            consent={guest.marketing_consent}
            block={blockText}
          />
        </PanelSection>

        <PanelSection label={t("stays", { count: counted.length })}>
          {stays.length ? (
            <ul className="grid">
              {stays.map((s) => (
                <li key={s.id} className="border-hair border-b last:border-b-0">
                  <Link
                    href={`/admin/reservations?panel=reservation:${s.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#faf9f6]"
                  >
                    <span className="grid gap-0.5">
                      <span className="text-ink text-sm font-medium">
                        {s.checkIn && s.checkOut ? `${date(s.checkIn)} – ${date(s.checkOut)}` : "—"}
                      </span>
                      <span className="text-[12.5px] text-[#5a6672]">
                        {t("stayMeta", {
                          number: s.number,
                          guests: s.guests,
                          status: tr(`statuses.${s.status as "confirmed"}`),
                        })}
                      </span>
                    </span>
                    <span className="text-ink text-sm">
                      {formatMoney(money(s.totalCents, s.currency || tenant.currency), locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#5a6672]">{t("staysEmpty")}</p>
          )}
        </PanelSection>

        <NoteForm key={note} id={guest.id} body={note} />
      </div>
    ),
    actions: (
      <>
        {messages && latest ? (
          <Button asChild className="font-bold">
            <Link href={`/admin/reservations?panel=reservation:${latest.id}&tab=messages`}>
              <MessageCircle /> {t("message")}
            </Link>
          </Button>
        ) : (
          <Button asChild className="font-bold">
            <a href={`mailto:${guest.email}`}>
              <MessageCircle /> {t("message")}
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={newHref}>
            <Plus /> {t("newReservation")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`/admin/guests/${guest.id}/data`} download>
            <Download /> {t("data")}
          </a>
        </Button>
      </>
    ),
  };
}
