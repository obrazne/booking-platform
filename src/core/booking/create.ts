"use server";

import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { calculatePrice } from "@/core/pricing/calculate";
import { addDays, diffDays, todayIso } from "@/core/pricing/dates";
import type { PriceLine } from "@/core/pricing/types";
import { tr } from "@/core/i18n/localized";
import { enabledModuleKeysPublic } from "@/core/modules/registry";
import { getTenantFromHost } from "@/core/tenant/current";
import { priceContributorsFor } from "@/modules/price-contributors";
import { guardGuestAction } from "@/core/security/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { normalizeGiftCode } from "@/core/gift-vouchers/state";
import { propertyMethods } from "@/core/payments/methods";
import { getGuestSettings, getPublicProperty } from "./catalog";
import { toDiscounts, toPricingInput } from "./pricing-input";
import { issueFormToken, verifyFormToken } from "./form-token";
import { notifyReservationCreated } from "./notify";

export type BookingState = {
  error:
    | null
    | "invalid"
    | "unavailable"
    | "price"
    | "consent"
    | "captcha"
    | "limit"
    | "generic"
    | "billing"
    | "payment"
    | "voucher"
    | "giftVoucher"
    | "suspended";
  details?: string[];
};

const MIN_FILL_MS = 3000;
/** Longest stay a guest can hold or book online (longer stays by agreement with the owner). */
const MAX_GUEST_NIGHTS = 30;

/** Stay a guest may hold or book: not in the past (one day of time-zone slack), not absurdly long or far. */
function guestStayAllowed(checkIn: string, checkOut: string): boolean {
  const today = todayIso();
  const nights = diffDays(checkIn, checkOut);
  return (
    checkIn >= addDays(today, -1) &&
    checkIn <= addDays(today, 3 * 365) &&
    nights >= 1 &&
    nights <= MAX_GUEST_NIGHTS
  );
}

/** Signed time stamp for the payment step (bot protection that the browser cannot fake). */
export async function startBookingForm(): Promise<string> {
  return issueFormToken();
}

const schema = z.object({
  slug: z.string().min(1),
  unit_id: z.uuid(),
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50),
  infants: z.coerce.number().int().min(0).max(20),
  pets: z.coerce.number().int().min(0).max(10),
  guest_name: z.string().trim().min(2).max(120),
  guest_email: z.email().max(200),
  guest_phone: z.string().trim().max(40).optional().default(""),
  guest_country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/)
    .optional()
    .default(""),
  guest_note: z.string().trim().max(2000).optional().default(""),
  promo_code: z.string().trim().max(40).optional().default(""),
  hold_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .default(""),
  form_token: z.string().max(200),
  captcha_token: z.string().max(2048).optional().default(""),
  // Honeypot: real people never see this field.
  website: z.string().max(0).optional().default(""),
  // Z71: the chosen way to pay (checked against the ways the owner switched on) and the company for an invoice.
  payment_method: z
    .enum(["bank_transfer", "card", "recreation_voucher"])
    .optional()
    .default("bank_transfer"),
  // Z77: the recreation voucher — number and issuer (the owner checks them at the approval).
  voucher_number: z.string().trim().max(60).optional().default(""),
  voucher_issuer: z.string().trim().max(120).optional().default(""),
  // Z78: a gift voucher pays part (or all) — checked and deducted again in the database.
  gift_voucher_code: z.string().trim().max(30).optional().default(""),
  invoice: z.string().max(1).optional().default(""),
  billing_company: z.string().trim().max(200).optional().default(""),
  billing_company_id: z.string().trim().max(20).optional().default(""),
  billing_tax_id: z.string().trim().max(20).optional().default(""),
  billing_vat_id: z.string().trim().max(20).optional().default(""),
  billing_address: z.string().trim().max(300).optional().default(""),
});

/** Label of a frozen price line in the guest's language. */
function lineLabel(line: PriceLine, locale: string, touristTaxLabel: string): string {
  if (line.labelKey === "touristTax") return touristTaxLabel;
  return line.name ? tr(line.name, locale) : "";
}

/**
 * Creates a reservation from the guest form (B5, B7): the server recomputes the price (never trusts the browser),
 * the database takes the term atomically and freezes the lines. On success redirects to the guest's reservation page.
 */
export async function createGuestReservation(
  _: BookingState,
  form: FormData,
): Promise<BookingState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "invalid", details: parsed.error.issues.map((i) => i.path.join(".")) };
  const v = parsed.data;
  if (!verifyFormToken(v.form_token, MIN_FILL_MS)) return { error: "invalid" };
  if (!guestStayAllowed(v.check_in, v.check_out)) return { error: "price" };
  if (form.get("consent_terms") !== "on" || form.get("consent_cancellation") !== "on") {
    return { error: "consent" };
  }

  const billing =
    v.invoice === "1"
      ? {
          company: v.billing_company,
          company_id: v.billing_company_id,
          tax_id: v.billing_tax_id,
          vat_id: v.billing_vat_id,
          address: v.billing_address,
        }
      : null;
  if (
    billing &&
    (billing.company.length < 2 ||
      !billing.company_id ||
      !billing.tax_id ||
      billing.address.length < 3)
  )
    return { error: "billing" };

  const voucher =
    v.payment_method === "recreation_voucher"
      ? { number: v.voucher_number, issuer: v.voucher_issuer }
      : null;
  if (voucher && (!voucher.number || voucher.issuer.length < 2)) return { error: "voucher" };
  const giftCode = v.gift_voucher_code ? normalizeGiftCode(v.gift_voucher_code) : null;
  // A recreation voucher and a gift voucher together are not combined (one company invoice, one rest).
  if (v.gift_voucher_code && (!giftCode || voucher)) return { error: "giftVoucher" };

  const tenant = await getTenantFromHost();
  if (!tenant) return { error: "generic" };
  const detail = await getPublicProperty(tenant, v.slug);
  // Only a way the owner switched on and that works (the inactive "Pripravujeme" card cannot be chosen); on a property
  // "na schválenie" only the ways that work with the approval (Z77).
  if (
    !propertyMethods(
      (await getGuestSettings(tenant.id)).paymentMethods,
      detail.property.booking_approval === "approval",
    ).includes(v.payment_method)
  )
    return { error: "payment" };
  const blocked = await guardGuestAction(tenant.id, "reservation", v.captcha_token);
  if (blocked) return { error: blocked };
  const locale = await getLocale();
  const catalog = detail.catalogs[v.unit_id];
  if (!catalog) return { error: "invalid" };

  const selectedServices: Record<string, number> = {};
  const selectedFees: Record<string, number> = {};
  for (const [key, value] of form.entries()) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) continue;
    if (key.startsWith("service_")) selectedServices[key.slice(8)] = Math.min(n, 50);
    if (key.startsWith("fee_")) selectedFees[key.slice(4)] = Math.min(n, 50);
  }

  // Promo codes are secret: looked up here with the service key, never sent to the browser.
  const admin = createAdminClient();
  const code = v.promo_code.toUpperCase();
  const promo = code
    ? ((
        await admin
          .from("discounts")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("kind", "promo")
          .eq("active", true)
          .ilike("code", code)
          .or(`property_id.eq.${detail.property.id},property_id.is.null`)
      ).data ?? [])
    : [];

  const input = toPricingInput(
    catalog,
    {
      checkIn: v.check_in,
      checkOut: v.check_out,
      adults: v.adults,
      children: v.children,
      pets: v.pets,
      selectedServices,
      selectedFees,
      promoCode: code || null,
      bookedOn: todayIso(),
    },
    toDiscounts(promo),
  );
  const price = calculatePrice(
    input,
    priceContributorsFor(await enabledModuleKeysPublic(tenant.id)),
  );
  if (!price.ok) return { error: "price", details: price.errors.map((e) => e.code) };

  const touristTaxLabel = (await getTranslations("guest"))("touristTax");
  const consents = [
    {
      kind: "terms",
      version: detail.settings.termsUrl ?? "v1",
      text: String(form.get("consent_terms_text") ?? ""),
      granted: true,
    },
    {
      kind: "cancellation",
      version: "v1",
      text:
        tr(detail.settings.cancellationPolicy, locale) ||
        String(form.get("consent_cancellation_text") ?? ""),
      granted: true,
    },
    {
      kind: "privacy",
      version: detail.settings.privacyUrl ?? "v1",
      text: String(form.get("privacy_text") ?? ""),
      granted: true,
    },
    {
      kind: "marketing",
      version: "v1",
      text: String(form.get("consent_marketing_text") ?? ""),
      granted: form.get("consent_marketing") === "on",
    },
  ];

  const { data, error } = await admin
    .rpc("create_reservation", {
      p: {
        tenant_id: tenant.id,
        property_id: detail.property.id,
        unit_id: v.unit_id,
        check_in: v.check_in,
        check_out: v.check_out,
        status: "pending_payment",
        source: "direct",
        guest_name: v.guest_name,
        guest_email: v.guest_email,
        guest_phone: v.guest_phone,
        guest_country: v.guest_country,
        adults: v.adults,
        children: v.children,
        infants: v.infants,
        pets: v.pets,
        locale,
        currency: tenant.currency,
        total_cents: price.totalCents,
        guest_note: v.guest_note,
        promo_code: price.lines.some((l) => l.kind === "discount" && l.meta.code) ? code : null,
        marketing_consent: form.get("consent_marketing") === "on",
        payment_method: v.payment_method,
        billing,
        voucher,
        gift_voucher: giftCode ? { code: giftCode } : null,
        hold_id: v.hold_id || null,
        lines: price.lines.map((l) => ({
          kind: l.kind,
          ref_id: l.refId,
          label: lineLabel(l, locale, touristTaxLabel),
          quantity: l.quantity,
          unit_amount_cents: l.unitAmountCents,
          amount_cents: l.amountCents,
          vat_bp: l.vatBp,
          meta: l.meta,
        })),
        consents,
      } as unknown as Json,
    })
    .single();
  if (error)
    return {
      error:
        error.code === "23P01"
          ? "unavailable"
          : error.code === "P0002"
            ? "giftVoucher"
            : error.code === "LIC01"
              ? "suspended"
              : "generic",
    };

  await notifyReservationCreated(data.id, data.access_token).catch(() => undefined);
  redirect(`/r/${data.access_token}`);
}

/** Temporary hold while the guest fills the form (B2). Returns the hold id, or null when the term is taken. */
export async function holdTerm(
  unitId: string,
  checkIn: string,
  checkOut: string,
): Promise<string | null> {
  const ok = z
    .object({ unitId: z.uuid(), checkIn: z.iso.date(), checkOut: z.iso.date() })
    .safeParse({ unitId, checkIn, checkOut });
  if (!ok.success || !guestStayAllowed(checkIn, checkOut)) return null;
  const tenant = await getTenantFromHost();
  if (!tenant) return null;
  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("tenant_id, active, property:properties(status)")
    .eq("id", unitId)
    .single();
  if (unit?.tenant_id !== tenant.id || !unit.active || unit.property?.status !== "published")
    return null;
  const { data, error } = await admin.rpc("create_hold", {
    p_unit_id: unitId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });
  return error ? null : (data as string);
}

export type GiftVoucherPreview =
  | { ok: true; code: string; balanceCents: number }
  | { ok: false; error: "none" | "captcha" | "limit" };

/**
 * Z78: checks a gift voucher for the cart — its code, that it is valid and what is left on it. Behind the captcha and
 * the IP limit (codes cannot be tried by a script); the reservation checks and deducts it again in the database.
 */
export async function previewGiftVoucher(input: {
  code: string;
  captchaToken: string;
}): Promise<GiftVoucherPreview> {
  const none = { ok: false, error: "none" } as const;
  const tenant = await getTenantFromHost();
  const code = normalizeGiftCode(input.code);
  if (!tenant || !code) return none;
  const blocked = await guardGuestAction(tenant.id, "gift_voucher", input.captchaToken);
  if (blocked) return { ok: false, error: blocked };
  const { data } = await createAdminClient()
    .from("gift_vouchers")
    .select("code, balance_cents, valid_until, status")
    .eq("tenant_id", tenant.id)
    .eq("code", code)
    .maybeSingle();
  if (!data || data.status !== "active" || data.balance_cents <= 0) return none;
  if (data.valid_until && data.valid_until < todayIso()) return none;
  return { ok: true, code: data.code, balanceCents: data.balance_cents };
}

export type PromoPreview =
  | { ok: true; name: Record<string, string>; amountCents: number }
  | { ok: false; error: "none" | "captcha" | "limit" };

/**
 * Checks a promo code for the stay on the server (codes are never sent to the browser). Returns the discount line.
 * Behind the captcha and the IP limit, so codes cannot be guessed by a script.
 */
export async function previewPromo(input: {
  slug: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  code: string;
  captchaToken: string;
}): Promise<PromoPreview> {
  const none = { ok: false, error: "none" } as const;
  const tenant = await getTenantFromHost();
  const code = input.code.trim().toUpperCase();
  if (!tenant || !code || !/^[A-Z0-9_-]{1,40}$/.test(code)) return none;
  const blocked = await guardGuestAction(tenant.id, "promo", input.captchaToken);
  if (blocked) return { ok: false, error: blocked };
  const detail = await getPublicProperty(tenant, input.slug);
  const catalog = detail.catalogs[input.unitId];
  if (!catalog) return none;
  const admin = createAdminClient();
  const { data } = await admin
    .from("discounts")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("kind", "promo")
    .eq("active", true)
    .ilike("code", code)
    .or(`property_id.eq.${detail.property.id},property_id.is.null`);
  const price = calculatePrice(
    toPricingInput(
      catalog,
      {
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        adults: input.adults,
        children: input.children,
        pets: 0,
        selectedServices: {},
        selectedFees: {},
        promoCode: code,
        bookedOn: todayIso(),
      },
      toDiscounts(data ?? []),
    ),
  );
  if (!price.ok) return none;
  const line = price.lines.find((l) => l.kind === "discount" && l.meta.code);
  return line ? { ok: true, name: line.name ?? {}, amountCents: line.amountCents } : none;
}
