import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sk from "@/i18n/messages/sk.json";
import { CORE_FAQS, HELP_TOPICS, helpHref } from "@/core/help/faqs";
import { ADMIN_REGISTRY, entryHref, fold, matches, PLATFORM_REGISTRY } from "./registry";

function lookup(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], sk);
}

describe("search register and Pomoc (Z67)", () => {
  it("every row of the register has its words", () => {
    for (const e of [...ADMIN_REGISTRY, ...PLATFORM_REGISTRY]) {
      for (const k of ["title", "where", "terms"]) {
        expect(typeof lookup(`search.entries.${e.id}.${k}`), `${e.id}.${k}`).toBe("string");
      }
    }
    const ids = [...ADMIN_REGISTRY, ...PLATFORM_REGISTRY].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every question has a question, steps and a button; topics are translated", () => {
    for (const f of CORE_FAQS) {
      expect(typeof lookup(`help.faqs.${f.id}.q`), f.id).toBe("string");
      expect(Array.isArray(lookup(`help.faqs.${f.id}.steps`)), f.id).toBe(true);
      expect(typeof lookup(`help.faqs.${f.id}.go`), f.id).toBe("string");
    }
    for (const topic of HELP_TOPICS) expect(typeof lookup(`help.topics.${topic}`)).toBe("string");
  });

  it("questions of the modules have their words in the module's namespace", () => {
    const dir = join(process.cwd(), "src/modules");
    for (const d of readdirSync(dir, { withFileTypes: true }).filter((x) => x.isDirectory())) {
      let src: string;
      try {
        src = readFileSync(join(dir, d.name, "manifest.ts"), "utf8");
      } catch {
        continue;
      }
      const ns = /messages:\s*"([^"]+)"/.exec(src)?.[1];
      const faqs = /helpFaqs:\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? "";
      for (const [, id] of faqs.matchAll(/id:\s*"([^"]+)"/g)) {
        expect(typeof lookup(`${ns}.help.${id}.q`), `${ns}.help.${id}`).toBe("string");
        expect(Array.isArray(lookup(`${ns}.help.${id}.steps`)), `${ns}.help.${id}`).toBe(true);
      }
    }
  });

  it("matches the beginnings of words, without diacritics", () => {
    expect(fold("Upratovacie DNI")).toBe("upratovacie dni");
    expect(matches("Upratovacie dni medzi pobytmi", "uprat")).toBeGreaterThan(0);
    expect(matches("Upratovacie dni medzi pobytmi", "UPRATOV dni")).toBeGreaterThan(0);
    expect(matches("Kód od dverí", "kod")).toBeGreaterThan(0);
    expect(matches("Blokácie", "odblok")).toBe(0);
    expect(matches("zablokovať termín", "blok")).toBeGreaterThan(0);
    expect(matches("Bankový účet (IBAN)", "iban storno")).toBe(0);
  });

  it("addresses with the field to highlight", () => {
    expect(entryHref({ href: "/admin/settings", field: "iban" }, "")).toBe(
      "/admin/settings?hl=iban",
    );
    expect(entryHref({ href: "/admin/properties/{property}", field: "door_code" }, "p1")).toBe(
      "/admin/properties/p1?hl=door_code",
    );
    expect(entryHref({ href: "/platform/status#backups-title" }, "")).toBe(
      "/platform/status#backups-title",
    );
    expect(helpHref("blockDates")).toBe("/admin/help?open=blockDates");
  });
});
