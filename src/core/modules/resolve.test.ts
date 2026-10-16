import { describe, expect, it } from "vitest";
import { isEnabledStatus, resolveEnabled } from "./resolve";

const m = (key: string, dependsOn?: string[]) => ({ key, messages: key, dependsOn });

describe("module switches", () => {
  it("treats an expired trial as off", () => {
    expect(isEnabledStatus("trial", "2026-01-01", "2026-01-02")).toBe(false);
    expect(isEnabledStatus("trial", "2026-01-02", "2026-01-02")).toBe(true);
    expect(isEnabledStatus("active", null, "2026-01-02")).toBe(true);
    expect(isEnabledStatus("off", null, "2026-01-02")).toBe(false);
  });

  it("switches off a module whose dependency is off", () => {
    const all = [m("services"), m("upsell", ["services"])];
    expect(resolveEnabled(all, new Set(["upsell"])).map((x) => x.key)).toEqual([]);
    expect(resolveEnabled(all, new Set(["upsell", "services"])).map((x) => x.key)).toEqual([
      "services",
      "upsell",
    ]);
  });
});
