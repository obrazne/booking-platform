import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes separators and quotes, adds BOM", () => {
    expect(toCsv(["a", "b"], [["x;y", 'say "hi"']])).toBe('﻿a;b\r\n"x;y";"say ""hi"""\r\n');
  });

  it("neutralises formulas", () => {
    expect(toCsv(["a"], [["=SUM(A1)"]])).toBe("﻿a\r\n'=SUM(A1)\r\n");
  });

  it("writes empty cells for null", () => {
    expect(toCsv(["a", "b"], [[null, 1]])).toBe("﻿a;b\r\n;1\r\n");
  });
});
