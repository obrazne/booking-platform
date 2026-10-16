import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { sectionTypes } = await import("./registry");

// Every type used by the section templates in supabase/migrations/20261016260000_property_sections.sql.
const TEMPLATE_TYPES = [
  "gallery",
  "intro",
  "highlights",
  "photo_band",
  "calendar",
  "prices",
  "included",
  "units",
  "about",
  "location",
  "testimonials",
  "faq",
  "rules",
  "contact",
  "cta",
  "inside",
];

describe("section registry", () => {
  it("knows every type the templates use", () => {
    const types = sectionTypes([]);
    for (const t of TEMPLATE_TYPES) expect(types.has(t), t).toBe(true);
  });

  it("adds module types only for enabled modules", () => {
    expect(sectionTypes([]).has("services")).toBe(false);
    expect(sectionTypes(["services"]).has("services")).toBe(true);
  });

  it("rejects invalid content instead of rendering it", () => {
    const highlights = sectionTypes([]).get("highlights")!;
    expect(highlights.schema.safeParse({ items: [{ amenity: "sauna" }] }).success).toBe(true);
    expect(highlights.schema.safeParse({ items: [{ icon: "rocket" }] }).success).toBe(false);
    expect(sectionTypes([]).get("faq")!.schema.safeParse({ items: "x" }).success).toBe(false);
  });
});
