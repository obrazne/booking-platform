import { MODULES } from "@/modules";
import { CORE_SECTIONS } from "./core-sections";
import type { SectionDef } from "./types";

/** Section types available to a tenant: core types plus types of its enabled modules (B7). */
export function sectionTypes(enabledModules: readonly string[]): Map<string, SectionDef> {
  const map = new Map<string, SectionDef>(CORE_SECTIONS.map((d) => [d.type, d]));
  for (const m of MODULES) {
    if (!enabledModules.includes(m.key)) continue;
    for (const d of m.sections ?? []) map.set(d.type, d);
  }
  return map;
}

/** Types defined by any module (known, just switched off for this tenant — not an error). */
export function moduleSectionTypes(): Set<string> {
  return new Set(MODULES.flatMap((m) => (m.sections ?? []).map((d) => d.type)));
}
