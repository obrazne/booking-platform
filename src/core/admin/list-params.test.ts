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

describe("page size and page (rule 7)", () => {
  it("takes 20, 50 or 100 from the URL, then the remembered one, else 20", async () => {
    const { pageSizeOf, pageOf } = await import("./list-params");
    expect(pageSizeOf("50")).toBe(50);
    expect(pageSizeOf(undefined, "100")).toBe(100);
    expect(pageSizeOf("37", "50")).toBe(50);
    expect(pageSizeOf("1000", "7")).toBe(20);
    expect(pageSizeOf(["100"])).toBe(100);
    expect(pageOf("3")).toBe(3);
    expect(pageOf("-1")).toBe(1);
    expect(pageOf("x")).toBe(1);
    expect(pageOf(undefined)).toBe(1);
  });
});

describe("page numbers under a list", () => {
  it("shows first, last and the neighbours, a gap as null", async () => {
    const { pageItems } = await import("./list-params");
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(10, 408)).toEqual([1, null, 9, 10, 11, null, 408]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
