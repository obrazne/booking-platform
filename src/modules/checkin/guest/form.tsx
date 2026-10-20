"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { missingFields, rulesFor, type CheckinField } from "../rules";
import { finishCheckin } from "./actions";
import { COUNTRY_CODES } from "./countries";
import type { GuestCheckinView } from "./load";

type Person = {
  id?: string;
  first_name: string;
  last_name: string;
  is_citizen: boolean;
  nationality: string;
  birth_date: string;
  document_type: string;
  document_number: string;
  address: string;
  /** Saved document number / date of birth — shown masked, kept unless the guest changes them. */
  docMasked: string | null;
  hasBirth: boolean;
};

type Props = {
  reservationId: string;
  token?: string;
  locale: string;
  expected: number;
  guestName: string;
  persons: GuestCheckinView["persons"];
  arrivalTime: string | null;
  checkInFrom: string | null;
  houseRulesAccepted: boolean;
  houseRulesUrl: string | null;
  documentTypes: string[];
  doneHref: string;
};

const field =
  "h-[46px] w-full rounded-[10px] border border-[#e9e5db] bg-white px-3.5 text-[15px] text-[#11212f] aria-[invalid=true]:border-[#a04a1f]";
const label = "grid min-w-0 gap-1.5";
const labelText = "text-[13px] font-medium text-[#3b3d42]";

/** The form of the online check-in (Z39): persons by the rules of the country, arrival time, consent. */
export function CheckinForm(props: Props) {
  const t = useTranslations("modules.checkin.guest");
  const router = useRouter();
  const rules = rulesFor("SK");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [people, setPeople] = useState<Person[]>(() => {
    const saved: Person[] = props.persons.map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      is_citizen: p.is_citizen,
      nationality: p.is_citizen ? "" : (p.nationality ?? ""),
      birth_date: "",
      document_type: p.document_type ?? "id_card",
      document_number: "",
      address: p.address ?? "",
      docMasked: p.document_masked,
      hasBirth: p.has_birth_date,
    }));
    const [first = "", ...rest] = props.guestName.trim().split(/\s+/);
    while (saved.length < Math.max(1, props.expected)) {
      const isFirst = saved.length === 0;
      saved.push({
        first_name: isFirst ? first : "",
        last_name: isFirst ? rest.join(" ") : "",
        is_citizen: true,
        nationality: "",
        birth_date: "",
        document_type: "id_card",
        document_number: "",
        address: "",
        docMasked: null,
        hasBirth: false,
      });
    }
    return saved;
  });
  const [arrival, setArrival] = useState(props.arrivalTime ?? "");
  const [consent, setConsent] = useState(props.houseRulesAccepted);

  const missingOf = (p: Person): CheckinField[] =>
    missingFields(
      {
        ...p,
        nationality: p.is_citizen ? "SK" : p.nationality,
        document_number: p.document_number || p.docMasked,
        birth_date: p.birth_date || (p.hasBirth ? "saved" : ""),
      },
      rules,
    );
  const missing = people.map(missingOf);
  const firstIncomplete = missing.findIndex((m) => m.length > 0);
  const [open, setOpen] = useState(firstIncomplete >= 0 ? firstIncomplete : 0);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([props.locale], { type: "region" });
    return COUNTRY_CODES.filter((c) => c !== "SK")
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name, props.locale));
  }, [props.locale]);
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  const times = useMemo(() => {
    const from = Number((props.checkInFrom ?? "15:00").slice(0, 2)) || 15;
    const list = [0, 1, 2, 3, 4].map((i) => {
      const h = Math.min(23, from + i);
      const value = `${String(h).padStart(2, "0")}:00`;
      return { value, label: i === 4 ? t("after", { time: `${h - 1}:00` }) : `${h}:00` };
    });
    if (props.arrivalTime && !list.some((x) => x.value === props.arrivalTime))
      list.push({ value: props.arrivalTime, label: props.arrivalTime });
    return list;
  }, [props.checkInFrom, props.arrivalTime, t]);

  const update = (i: number, patch: Partial<Person>) => {
    setError(null);
    setPeople((cur) => cur.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  };

  const submit = () => {
    setTried(true);
    if (firstIncomplete >= 0) {
      setOpen(firstIncomplete);
      setError(t("errors.fields"));
      return;
    }
    if (!arrival) return setError(t("errors.arrival"));
    if (!consent) return setError(t("errors.consent"));
    start(async () => {
      setError(null);
      const res = await finishCheckin({
        reservationId: props.reservationId,
        token: props.token,
        arrivalTime: arrival,
        houseRules: true,
        guests: people.map((p) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          is_citizen: p.is_citizen,
          nationality: p.is_citizen ? "" : p.nationality,
          birth_date: p.birth_date,
          document_type: p.document_type as "id_card" | "passport",
          document_number: p.document_number,
          address: p.address,
        })),
      });
      if (res.ok) {
        router.replace(window.location.pathname);
        router.refresh();
      } else setError(t(`errors.${res.error}`));
    });
  };

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        {people.map((p, i) => {
          const isOpen = open === i;
          const m = missing[i]!;
          const show = (f: CheckinField) => tried && m.includes(f);
          const id = `person-${i}`;
          const name = `${p.first_name} ${p.last_name}`.trim();
          return (
            <section key={i} className="guest-card overflow-hidden rounded-[10px]">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className={cn(
                  "flex w-full items-center gap-3.5 px-5 py-4 text-left",
                  isOpen ? "bg-[#fafaf8]" : "bg-white",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    m.length ? "bg-[#eceae4] text-[#5a6672]" : "bg-primary text-primary-foreground",
                  )}
                >
                  {m.length ? i + 1 : <Check className="size-3.5" strokeWidth={2.6} />}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="text-ink truncate text-base font-bold">
                    {name ? `${i + 1}. ${name}` : t("personN", { n: i + 1 })}
                  </span>
                  <span className="text-[13px] text-[#5a6672]">
                    {[
                      i === 0 ? t("booker") : t("companion"),
                      p.is_citizen
                        ? t("citizen")
                        : p.nationality
                          ? countryName(p.nationality)
                          : t("foreigner"),
                      m.length ? t("missingCount", { count: m.length }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-[#5a6672] transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen ? (
                <div
                  id={id}
                  className="grid gap-4 border-t border-[#ecebe6] px-5 py-5 sm:grid-cols-2"
                >
                  <label className={label}>
                    <span className={labelText}>{t("firstName")}</span>
                    <input
                      className={field}
                      value={p.first_name}
                      autoComplete={i === 0 ? "given-name" : "off"}
                      aria-invalid={show("first_name")}
                      maxLength={80}
                      onChange={(e) => update(i, { first_name: e.target.value })}
                    />
                  </label>
                  <label className={label}>
                    <span className={labelText}>{t("lastName")}</span>
                    <input
                      className={field}
                      value={p.last_name}
                      autoComplete={i === 0 ? "family-name" : "off"}
                      aria-invalid={show("last_name")}
                      maxLength={80}
                      onChange={(e) => update(i, { last_name: e.target.value })}
                    />
                  </label>
                  <fieldset className="grid gap-1.5 sm:col-span-2">
                    <legend className={cn(labelText, "mb-1.5")}>{t("nationality")}</legend>
                    <div className="flex flex-wrap gap-2">
                      {[true, false].map((citizen) => (
                        <button
                          key={String(citizen)}
                          type="button"
                          aria-pressed={p.is_citizen === citizen}
                          onClick={() => update(i, { is_citizen: citizen })}
                          className={cn(
                            "min-h-10 rounded-full border px-4 text-sm font-medium",
                            p.is_citizen === citizen
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-[#dcd9d1] bg-white text-[#11212f]",
                          )}
                        >
                          {citizen ? t("citizenLong") : t("otherCountry")}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  {!p.is_citizen ? (
                    <>
                      <label className={label}>
                        <span className={labelText}>{t("country")}</span>
                        <select
                          className={field}
                          value={p.nationality}
                          aria-invalid={show("nationality")}
                          onChange={(e) => update(i, { nationality: e.target.value })}
                        >
                          <option value="">{t("chooseCountry")}</option>
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Sensitive
                        label={t("birthDate")}
                        saved={p.hasBirth}
                        savedText={t("savedBirth")}
                        changeLabel={t("change")}
                        onChange={() => update(i, { hasBirth: false })}
                      >
                        <input
                          type="date"
                          className={field}
                          value={p.birth_date}
                          max={new Date().toISOString().slice(0, 10)}
                          aria-invalid={show("birth_date")}
                          onChange={(e) => update(i, { birth_date: e.target.value })}
                        />
                      </Sensitive>
                    </>
                  ) : null}
                  <label className={label}>
                    <span className={labelText}>{t("documentType")}</span>
                    <select
                      className={field}
                      value={p.document_type}
                      aria-invalid={show("document_type")}
                      onChange={(e) => update(i, { document_type: e.target.value })}
                    >
                      {props.documentTypes.map((d) => (
                        <option key={d} value={d}>
                          {t(`documentTypes.${d as "id_card"}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Sensitive
                    label={t("documentNumber")}
                    saved={Boolean(p.docMasked)}
                    savedText={t("savedDocument", { masked: p.docMasked ?? "" })}
                    changeLabel={t("change")}
                    onChange={() => update(i, { docMasked: null })}
                  >
                    <input
                      className={field}
                      value={p.document_number}
                      autoComplete="off"
                      maxLength={40}
                      aria-invalid={show("document_number")}
                      onChange={(e) => update(i, { document_number: e.target.value })}
                    />
                  </Sensitive>
                  <label className={cn(label, "sm:col-span-2")}>
                    <span className={labelText}>{t("address")}</span>
                    <input
                      className={field}
                      value={p.address}
                      autoComplete={i === 0 ? "street-address" : "off"}
                      maxLength={300}
                      placeholder={t("addressHint")}
                      aria-invalid={show("address")}
                      onChange={(e) => update(i, { address: e.target.value })}
                    />
                  </label>
                  {tried && m.length ? (
                    <p className="text-sm font-medium text-[#a04a1f] sm:col-span-2">
                      {t("fillHighlighted")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <fieldset className="grid gap-2.5">
        <legend className="text-ink mb-2.5 text-lg font-bold">{t("arrivalTitle")}</legend>
        <div className="flex flex-wrap gap-2">
          {times.map((x) => (
            <button
              key={x.value}
              type="button"
              aria-pressed={arrival === x.value}
              onClick={() => setArrival(x.value)}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-medium",
                arrival === x.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[#dcd9d1] bg-white text-[#11212f]",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-[#5a6672]">
          {t("arrivalHint", { from: props.checkInFrom?.slice(0, 5) ?? "15:00" })}
        </p>
      </fieldset>

      <label className="flex items-start gap-3 text-[15px] text-[#3b3d42]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="accent-primary mt-0.5 size-5 shrink-0"
        />
        <span>
          {t.rich("consent", {
            link: (c) =>
              props.houseRulesUrl ? (
                <a
                  href={props.houseRulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-[3px]"
                >
                  {c}
                </a>
              ) : (
                <>{c}</>
              ),
          })}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !consent}
          aria-describedby="checkin-hint"
          className={cn(
            "min-h-[50px] rounded-full bg-[#2b3036] px-[26px] text-[15px] font-bold text-white hover:bg-[#0c0e11] disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          {pending ? t("saving") : t("finish")}
        </button>
        <span id="checkin-hint" className="text-[13px] text-[#5a6672]">
          {!consent ? t("consentFirst") : t("editUntil")}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[#a04a1f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A sensitive field already saved: shown only as "saved", replaced when the guest chooses to change it. */
function Sensitive({
  label: text,
  saved,
  savedText,
  changeLabel,
  onChange,
  children,
}: {
  label: string;
  saved: boolean;
  savedText: string;
  changeLabel: string;
  onChange: () => void;
  children: React.ReactElement;
}) {
  if (saved)
    return (
      <div className={label}>
        <span className={labelText}>{text}</span>
        <span className="flex h-[46px] items-center justify-between gap-3 rounded-[10px] border border-dashed border-[#dcd9d1] px-3.5 text-[15px] text-[#3b3d42]">
          <span>{savedText}</span>
          <button
            type="button"
            onClick={onChange}
            aria-label={`${changeLabel} — ${text}`}
            className="text-ink text-sm font-medium underline underline-offset-[3px]"
          >
            {changeLabel}
          </button>
        </span>
      </div>
    );
  return (
    <label className={label}>
      <span className={labelText}>{text}</span>
      {children}
    </label>
  );
}
