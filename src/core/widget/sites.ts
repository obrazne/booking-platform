/**
 * Websites where the client allows the booking widget (Z83): what the owner types ("chaletstromy.sk",
 * "https://www.chaletstromy.sk/ubytovanie") becomes an origin ("https://chaletstromy.sk"); the frame policy allows it
 * with and without "www.". Anything that is not a plain website is refused, so nothing can sneak into the header.
 */

export const MAX_WIDGET_SITES = 20;

/** Origin of one typed website, or null. Without a scheme it is https; http only when typed. */
export function normalizeSite(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  // A real host name (or localhost for trying it out) — no IP tricks, no wildcards.
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*[a-z0-9]$|^localhost$/.test(host)
  )
    return null;
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
}

/** Lines of the settings field → distinct origins (at most 20) and the lines that are not a website. */
export function parseSites(text: string): { sites: string[]; invalid: string[] } {
  const sites: string[] = [];
  const invalid: string[] = [];
  for (const line of text.split(/[\n,]+/)) {
    if (!line.trim()) continue;
    const site = normalizeSite(line);
    if (!site) invalid.push(line.trim());
    else if (!sites.includes(site)) sites.push(site);
  }
  return { sites: sites.slice(0, MAX_WIDGET_SITES), invalid };
}

/** `frame-ancestors` for the embed pages: the client's own domain and the allowed websites (± "www."). */
export function frameAncestors(sites: readonly string[]): string {
  const all = new Set<string>();
  for (const s of sites) {
    const site = normalizeSite(s);
    if (!site) continue;
    all.add(site);
    const url = new URL(site);
    if (url.hostname === "localhost") continue;
    const other = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
    all.add(`${url.protocol}//${other}${url.port ? `:${url.port}` : ""}`);
  }
  return `frame-ancestors 'self'${[...all].map((s) => ` ${s}`).join("")}`;
}
