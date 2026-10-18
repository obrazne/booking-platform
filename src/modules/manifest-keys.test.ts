import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sk from "@/i18n/messages/sk.json";

// Every module's texts the core reads by key (Z57: the control center showed `modules.messages.title`): the title,
// the menu labels of its nav items and its name in the catalog of the control center.
const dir = join(process.cwd(), "src/modules");
const manifests = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(dir, d.name, "manifest.ts"))
  .filter((f) => {
    try {
      readFileSync(f);
      return true;
    } catch {
      return false;
    }
  });

function lookup(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], sk);
}

describe("module manifests and sk.json", () => {
  it("finds the manifests", () => {
    expect(manifests.length).toBeGreaterThan(3);
  });
  for (const file of manifests) {
    const src = readFileSync(file, "utf8");
    const key = /key:\s*"([^"]+)"/.exec(src)?.[1];
    const ns = /messages:\s*"([^"]+)"/.exec(src)?.[1];
    it(`${key}: title, menu labels and catalog name`, () => {
      expect(key).toBeTruthy();
      expect(ns).toBeTruthy();
      const missing = [
        `${ns}.title`,
        ...[...src.matchAll(/labelKey:\s*"([^"]+)"/g)].map((m) => `${ns}.${m[1]}`),
        `platform.catalog.${key}.name`,
      ].filter((k) => typeof lookup(k) !== "string");
      expect(missing).toEqual([]);
    });
  }
});
