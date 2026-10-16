import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Only public https addresses — the calendar is fetched by our server (no internal hosts). */
export function isSafeCalendarUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  )
    return false;
  return isIP(host) === 0; // IP literals are refused
}

/** Private, loopback, link-local, CGNAT, multicast and reserved addresses (IPv4 and IPv6). */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const x = ip.toLowerCase();
  return (
    x === "::" ||
    x === "::1" ||
    x.startsWith("fc") ||
    x.startsWith("fd") ||
    x.startsWith("fe8") ||
    x.startsWith("fe9") ||
    x.startsWith("fea") ||
    x.startsWith("feb") ||
    x.startsWith("ff")
  );
}

async function resolvesPublic(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/**
 * Fetches a calendar: https only, every hop (redirects followed by hand) must resolve to public addresses,
 * response read as a stream and cut at `maxBytes`. (Pinning the resolved IP for the connection itself is not possible
 * with fetch; the window for DNS rebinding is the moment between the check and the request.)
 */
export async function fetchCalendar(raw: string, maxBytes: number): Promise<string> {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    if (!isSafeCalendarUrl(current)) throw new Error("Address not allowed");
    if (!(await resolvesPublic(new URL(current).hostname))) throw new Error("Address not allowed");
    const res = await fetch(current, {
      headers: { "user-agent": "booking-platform-ical/1.0" },
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new Error(`HTTP ${res.status}`);
      current = new URL(next, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Calendar too large");
      }
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error("Too many redirects");
}
