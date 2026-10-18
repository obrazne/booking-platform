import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

export type FormSection = { heading: string; rows: [string, string][] };

/**
 * A plain A4 form (title, sections of label → value, signature lines) in Geist, which has the Slovak diacritics.
 * Used for the data of a foreigner to report (Z36); not an official form.
 */
export async function renderFormPdf(input: {
  title: string;
  subtitle?: string;
  sections: FormSection[];
  signatures?: string[];
  footer?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    await readFile(path.join(process.cwd(), "src/core/pdf/Geist-Regular.ttf")),
    { subset: true },
  );
  doc.setTitle(input.title);
  let page = doc.addPage([595.28, 841.89]);
  const ink = rgb(0.11, 0.11, 0.1);
  const muted = rgb(0.42, 0.42, 0.45);
  const line = rgb(0.85, 0.83, 0.79);
  let y = 790;
  const left = 56;
  const width = 595.28 - left * 2;
  // Long content (e.g. many items of an invoice basis, Z51) continues on the next page.
  const room = (height: number) => {
    if (y - height >= 70) return;
    page = doc.addPage([595.28, 841.89]);
    y = 790;
  };

  const wrap = (text: string, size: number, max: number): string[] => {
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > max && current) {
        out.push(current);
        current = word;
      } else current = next;
    }
    if (current) out.push(current);
    return out;
  };

  page.drawText(input.title, { x: left, y, size: 18, font, color: ink });
  y -= 22;
  if (input.subtitle) {
    for (const l of wrap(input.subtitle, 9.5, width)) {
      page.drawText(l, { x: left, y, size: 9.5, font, color: muted });
      y -= 13;
    }
  }
  y -= 10;
  for (const section of input.sections) {
    room(40);
    page.drawText(section.heading.toUpperCase(), { x: left, y, size: 8.5, font, color: muted });
    y -= 8;
    for (const [label, value] of section.rows) {
      room(30);
      page.drawLine({
        start: { x: left, y },
        end: { x: left + width, y },
        thickness: 0.6,
        color: line,
      });
      y -= 15;
      const labels = wrap(label, 10, width * 0.36);
      labels.forEach((l, i) =>
        page.drawText(l, { x: left, y: y - i * 12, size: 10, font, color: muted }),
      );
      const lines = wrap(value || "—", 10.5, width * 0.6);
      lines.forEach((l, i) =>
        page.drawText(l, { x: left + width * 0.38, y: y - i * 13, size: 10.5, font, color: ink }),
      );
      y -= 9 + Math.max((lines.length - 1) * 13, (labels.length - 1) * 12);
    }
    page.drawLine({
      start: { x: left, y },
      end: { x: left + width, y },
      thickness: 0.6,
      color: line,
    });
    y -= 26;
  }
  if (input.signatures?.length) {
    room(80);
    y -= 30;
    const w = (width - 30 * (input.signatures.length - 1)) / input.signatures.length;
    input.signatures.forEach((label, i) => {
      const x = left + i * (w + 30);
      page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.8, color: ink });
      page.drawText(label, { x, y: y - 13, size: 9, font, color: muted });
    });
  }
  if (input.footer)
    for (const p of doc.getPages())
      wrap(input.footer, 8, width).forEach((l, i) =>
        p.drawText(l, { x: left, y: 40 - i * 10, size: 8, font, color: muted }),
      );
  return doc.save();
}
