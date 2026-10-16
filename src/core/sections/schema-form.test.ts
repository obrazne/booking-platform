import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { sectionTypes } = await import("./registry");
const { cleanContent } = await import("./schema-form");

describe("section admin form", () => {
  it("every section type has a JSON schema for the generated form", () => {
    for (const [type, def] of sectionTypes(["services"])) {
      const schema = z.toJSONSchema(def.schema, { unrepresentable: "any" }) as { type?: string };
      expect(schema.type, type).toBe("object");
    }
  });

  it("drops empty texts and items so defaults apply, and the result passes the schema", () => {
    const value = {
      title: { sk: "  " },
      subtitle: { sk: "Pre celú partiu." },
      items: [{ amenity: "sauna", note: { sk: "" } }, { title: { sk: "" } }],
    };
    const cleaned = cleanContent(value);
    expect(cleaned).toEqual({
      subtitle: { sk: "Pre celú partiu." },
      items: [{ amenity: "sauna" }],
    });
    expect(sectionTypes([]).get("highlights")!.schema.safeParse(cleaned).success).toBe(true);
  });
});
