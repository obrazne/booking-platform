import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFImage } from "pdf-lib";

export type GiftVoucherPdfInput = {
  tenantName: string;
  /** The client's colour (#rrggbb) — the band and the value. */
  accent: string;
  /** Public https logo (PNG or JPG); without it the name of the client. */
  logoUrl: string | null;
  recipient: string | null;
  amount: string;
  code: string;
  validUntil: string | null;
  /** Where to use it ("chaletstromy.sk"). */
  site: string | null;
  labels: {
    kicker: string;
    forName: (name: string) => string;
    code: string;
    validUntil: (date: string) => string;
    noExpiry: string;
    useAt: (site: string) => string;
    useHow: string;
  };
};

function hexColor(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return rgb(0.18, 0.36, 0.31);
  return rgb(parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255);
}

async function embedLogo(doc: PDFDocument, url: string | null): Promise<PDFImage | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG starts with 0x89 'P'; JPG with 0xFF 0xD8. Other formats (SVG, WebP) fall back to the name.
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
    return null;
  } catch {
    return null;
  }
}

/**
 * Darčekový poukaz as a PDF (Z78) in the client's design: A5 landscape, a band in the client's colour with the logo
 * (or the name), the value, on whose name, the code, until when and where to use it. The internal note is not on it.
 */
export async function giftVoucherPdf(input: GiftVoucherPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await readFile(path.join(process.cwd(), "src/core/pdf/Geist-Regular.ttf")),
    { subset: true },
  );
  doc.setTitle(`${input.labels.kicker} · ${input.code}`);
  const W = 595.28;
  const H = 419.53;
  const page = doc.addPage([W, H]);
  const accent = hexColor(input.accent);
  const ink = rgb(0.07, 0.13, 0.18);
  const muted = rgb(0.35, 0.4, 0.45);
  const left = 44;

  // The band with the logo or the name.
  const band = 92;
  page.drawRectangle({ x: 0, y: H - band, width: W, height: band, color: accent });
  const logo = await embedLogo(doc, input.logoUrl);
  if (logo) {
    const h = 44;
    const w = Math.min(220, (logo.width / logo.height) * h);
    // A white tile, so a dark logo stays readable on the coloured band.
    page.drawRectangle({
      x: left - 8,
      y: H - band / 2 - h / 2 - 8,
      width: w + 16,
      height: h + 16,
      color: rgb(1, 1, 1),
    });
    page.drawImage(logo, { x: left, y: H - band / 2 - h / 2, width: w, height: h });
  } else {
    page.drawText(input.tenantName, {
      x: left,
      y: H - band / 2 - 8,
      size: 22,
      font,
      color: rgb(1, 1, 1),
    });
  }

  let y = H - band - 44;
  page.drawText(input.labels.kicker.toUpperCase(), {
    x: left,
    y,
    size: 11,
    font,
    color: muted,
  });
  y -= 52;
  page.drawText(input.amount, { x: left, y, size: 46, font, color: accent });
  y -= 30;
  if (input.recipient) {
    page.drawText(input.labels.forName(input.recipient), {
      x: left,
      y,
      size: 15,
      font,
      color: ink,
    });
    y -= 26;
  }

  // The code in a box (to type in the cart).
  const codeSize = 18;
  const codeWidth = font.widthOfTextAtSize(input.code, codeSize) + 28;
  page.drawText(input.labels.code, { x: left, y, size: 9, font, color: muted });
  y -= 36;
  page.drawRectangle({
    x: left,
    y: y - 10,
    width: codeWidth,
    height: 36,
    borderColor: accent,
    borderWidth: 1.4,
  });
  page.drawText(input.code, {
    x: left + 14,
    y: y + 1,
    size: codeSize,
    font,
    color: ink,
  });

  // Right column: until when and where.
  const rx = W - 44 - 210;
  let ry = H - band - 96;
  // Lines wrapped to the column (a long address of the site breaks at "." and "-" too).
  const wrap = (text: string, size: number, max: number): string[] => {
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/(?<=[\s.-])/)) {
      const next = current + word;
      if (font.widthOfTextAtSize(next.trimEnd(), size) > max && current) {
        out.push(current.trimEnd());
        current = word.trimStart();
      } else current = next;
    }
    if (current.trim()) out.push(current.trimEnd());
    return out;
  };
  const column = (text: string, size: number, color: typeof ink, gap: number) => {
    for (const l of wrap(text, size, 210)) {
      page.drawText(l, { x: rx, y: ry, size, font, color });
      ry -= size + 5;
    }
    ry -= gap;
  };
  column(
    input.validUntil ? input.labels.validUntil(input.validUntil) : input.labels.noExpiry,
    11.5,
    ink,
    6,
  );
  if (input.site) column(input.labels.useAt(input.site), 11.5, ink, 6);
  column(input.labels.useHow, 9.5, muted, 0);

  page.drawLine({
    start: { x: left, y: 40 },
    end: { x: W - 44, y: 40 },
    thickness: 0.6,
    color: rgb(0.85, 0.83, 0.79),
  });
  page.drawText(input.tenantName, { x: left, y: 24, size: 9, font, color: muted });
  return doc.save();
}
