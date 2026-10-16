import "server-only";
import { CurrencyCode, encode, PaymentOptions } from "bysquare/pay";
import QRCode from "qrcode";

/**
 * PAY by square QR (Slovak banking standard) as an SVG string (A5, B5).
 * Amount converts from integer cents only here, at the boundary to the format.
 */
export type PayBySquareInput = {
  iban: string;
  bic?: string | null;
  beneficiary: string;
  amountCents: number;
  currency: string;
  variableSymbol: string;
  note?: string;
};

function payload(input: PayBySquareInput): string | null {
  if (input.currency !== "EUR" && input.currency !== "CZK") return null;
  return encode({
    payments: [
      {
        type: PaymentOptions.PaymentOrder,
        amount: input.amountCents / 100,
        currencyCode: input.currency === "EUR" ? CurrencyCode.EUR : CurrencyCode.CZK,
        variableSymbol: input.variableSymbol,
        paymentNote: input.note?.slice(0, 140),
        beneficiary: { name: input.beneficiary.slice(0, 70) },
        bankAccounts: [
          { iban: input.iban.replace(/\s/g, ""), ...(input.bic ? { bic: input.bic } : {}) },
        ],
      },
    ],
  });
}

export async function payBySquareSvg(input: PayBySquareInput): Promise<string | null> {
  const data = payload(input);
  return data ? QRCode.toString(data, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null;
}

/** The same QR as a PNG data URL — the guest can save it and open it in the banking app on the same phone. */
export async function payBySquarePng(input: PayBySquareInput): Promise<string | null> {
  const data = payload(input);
  return data ? QRCode.toDataURL(data, { margin: 2, width: 640, errorCorrectionLevel: "M" }) : null;
}
