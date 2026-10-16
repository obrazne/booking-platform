import "server-only";
import { CurrencyCode, encode, PaymentOptions } from "bysquare/pay";
import QRCode from "qrcode";

/**
 * PAY by square QR (Slovak banking standard) as an SVG string (A5, B5).
 * Amount converts from integer cents only here, at the boundary to the format.
 */
export async function payBySquareSvg(input: {
  iban: string;
  bic?: string | null;
  beneficiary: string;
  amountCents: number;
  currency: string;
  variableSymbol: string;
  note?: string;
}): Promise<string | null> {
  if (input.currency !== "EUR" && input.currency !== "CZK") return null;
  const data = encode({
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
  return QRCode.toString(data, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
