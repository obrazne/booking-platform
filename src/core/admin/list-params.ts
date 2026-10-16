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

/** Range for PostgREST `.range(from, to)`. */
export function pageRange(p: ListParams): [number, number] {
  const from = (p.page - 1) * p.pageSize;
  return [from, from + p.pageSize - 1];
}

/** Escapes % and _ for ILIKE and strips characters that have meaning in PostgREST filter syntax. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ")}%`;
}
