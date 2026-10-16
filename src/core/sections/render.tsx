import { Fragment, type ReactNode } from "react";
import { moduleSectionTypes, sectionTypes } from "./registry";
import type { SectionData } from "./types";

export type StoredSection = {
  id: string;
  type: string;
  sort: number;
  enabled: boolean;
  content: unknown;
};

/**
 * Renders the property page from its sections (B7). Invalid content or an unknown type is logged and skipped — the page
 * never fails because of one section. The calendar with prices is mandatory: added after the intro when missing.
 */
export async function PropertySections({
  sections,
  data,
  modules,
}: {
  sections: StoredSection[];
  data: SectionData;
  modules: readonly string[];
}) {
  const types = sectionTypes(modules);
  const fromModules = moduleSectionTypes();
  const list = [...sections].filter((s) => s.enabled).sort((a, b) => a.sort - b.sort);
  if (!list.some((s) => s.type === "calendar")) {
    const at = list.findIndex((s) => s.type === "intro");
    list.splice(at + 1, 0, {
      id: "calendar",
      type: "calendar",
      sort: 0,
      enabled: true,
      content: {},
    });
  }

  const out: ReactNode[] = [];
  for (const s of list) {
    const def = types.get(s.type);
    if (!def) {
      if (!fromModules.has(s.type)) {
        console.error("[sections] unknown type", { property: data.property.id, type: s.type });
      }
      continue;
    }
    const parsed = def.schema.safeParse(s.content ?? {});
    if (!parsed.success) {
      console.error("[sections] invalid content", {
        property: data.property.id,
        type: s.type,
        issues: parsed.error.issues,
      });
      continue;
    }
    // Section logic runs here (not lazily as JSX), so a failing section is skipped, not the whole page.
    let node: ReactNode = null;
    try {
      node = await def.render({ content: parsed.data, data });
    } catch (e) {
      console.error("[sections] render failed", { property: data.property.id, type: s.type, e });
    }
    if (node) out.push(<Fragment key={s.id}>{node}</Fragment>);
  }
  return <>{out}</>;
}
