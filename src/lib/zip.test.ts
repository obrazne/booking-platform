import { describe, expect, it } from "vitest";
import { crc32, zip } from "./zip";

describe("zip", () => {
  it("computes CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a valid archive structure", () => {
    const z = zip([{ name: "údaje.json", data: '{"a":1}' }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(z.length - 22 + 10, true)).toBe(1);
  });
});
