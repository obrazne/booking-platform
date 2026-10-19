/** Server-side list state read from the URL: search, filters, sorting and paging (pattern from Rental Van, moved to the server). */
export type ListParams = {
  q: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListParams(
  params: SearchParams,
  options: {
    sortable: readonly string[];
    defaultSort: string;
    defaultDir?: "asc" | "desc";
    filters?: Record<string, readonly string[]>;
    pageSize?: number;
  },
): ListParams {
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);
  const sortRaw = first(params.sort);
  const sort = sortRaw && options.sortable.includes(sortRaw) ? sortRaw : options.defaultSort;
  const dirRaw = first(params.dir);
  const dir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : (options.defaultDir ?? "asc");
  const filters: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(options.filters ?? {})) {
    const value = first(params[key]);
    if (value && allowed.includes(value)) filters[key] = value;
  }
  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    page,
    pageSize: options.pageSize ?? 25,
    sort,
    dir,
    filters,
  };
}

/** Rows per page of a list (rule 7): 20 by default, 50 or 100 on request (`?size=`, remembered per list in a cookie). */
export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** A valid page size from the URL, else the remembered one, else 20. */
export function pageSizeOf(fromUrl: unknown, remembered?: unknown): PageSize {
  for (const v of [fromUrl, remembered]) {
    const n = Number(Array.isArray(v) ? v[0] : v);
    if ((PAGE_SIZES as readonly number[]).includes(n)) return n as PageSize;
  }
  return 20;
}

/** Cookie remembering the page size of one list ("rezervacie", "audit"…). */
export const pageSizeCookie = (list: string) => `list_size_${list}`;

/** Page number from the URL (1 when missing or invalid). */
export function pageOf(value: unknown): number {
  const n = Number.parseInt(String(Array.isArray(value) ? value[0] : (value ?? "1")), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Page numbers to show: first, last and two around the current one; `null` = a gap. */
export function pageItems(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const p of sorted) {
    const last = out.at(-1);
    if (typeof last === "number" && p - last === 2) out.push(last + 1);
    else if (typeof last === "number" && p - last > 2) out.push(null);
    out.push(p);
  }
  return out;
}

/** Range for PostgREST `.range(from, to)`. */
export function pageRange(p: ListParams): [number, number] {
  const from = (p.page - 1) * p.pageSize;
  return [from, from + p.pageSize - 1];
}

/** Escapes % and _ for ILIKE and strips characters that have meaning in PostgREST filter syntax. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ")}%`;
}
