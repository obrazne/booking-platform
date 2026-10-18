import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { crc32, createZip } from "./zip";

describe("crc32", () => {
  it("matches the known value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("writes entries that unpack to the same bytes", () => {
    const zip = createZip([
      { name: "a.json", data: '{"x":1}' },
      { name: "dokumenty/zmluva č.1.txt", data: "Ahoj ľudia" },
    ]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    // First local entry: name and deflated data.
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const nameLength = view.getUint16(26, true);
    const size = view.getUint32(18, true);
    expect(new TextDecoder().decode(zip.slice(30, 30 + nameLength))).toBe("a.json");
    const data = inflateRawSync(zip.slice(30 + nameLength, 30 + nameLength + size));
    expect(data.toString()).toBe('{"x":1}');
  });
});

describe("toCsv", () => {
  it("quotes what needs it and joins all columns", () => {
    const csv = toCsv([
      { a: 1, b: 'x;"y"' },
      { a: null, c: { k: 1 } },
    ]);
    expect(csv).toBe('﻿a;b;c\r\n1;"x;""y""";\r\n;;"{""k"":1}"\r\n');
  });
});
