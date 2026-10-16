import { describe, expect, it } from "vitest";
import { likePattern, pageRange, parseListParams } from "./list-params";

const options = {
  sortable: ["created_at", "role"],
  defaultSort: "created_at",
  filters: { role: ["owner", "reception"] },
  pageSize: 10,
};

describe("parseListParams", () => {
  it("falls back to defaults for unknown values", () => {
    const p = parseListParams(
      { sort: "password", dir: "sideways", page: "-3", role: "admin" },
      options,
    );
    expect(p).toMatchObject({ sort: "created_at", dir: "asc", page: 1, filters: {} });
  });

  it("reads valid values", () => {
    const p = parseListParams(
      { sort: "role", dir: "desc", page: "3", role: "owner", q: " anna " },
      options,
    );
    expect(p).toMatchObject({
      sort: "role",
      dir: "desc",
      page: 3,
      filters: { role: "owner" },
      q: "anna",
    });
    expect(pageRange(p)).toEqual([20, 29]);
  });
});

describe("likePattern", () => {
  it("escapes wildcards and filter syntax", () => {
    expect(likePattern("50%_a,b(c)")).toBe("%50\\%\\_a b c %");
  });
});
