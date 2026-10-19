import "server-only";
import { cookies } from "next/headers";
import { pageOf, pageSizeCookie, pageSizeOf, type PageSize } from "./list-params";

export type Paging = { list: string; page: number; size: PageSize; from: number; to: number };

/**
 * Page and page size of a list from the URL (`?page=`, `?size=`), the size falling back to the one remembered for this
 * list (rule 7). `from`/`to` go straight to PostgREST `.range()` — only one page is loaded from the database.
 */
export async function readPaging(
  sp: Record<string, string | string[] | undefined>,
  list: string,
): Promise<Paging> {
  const jar = await cookies();
  const size = pageSizeOf(sp.size, jar.get(pageSizeCookie(list))?.value);
  const page = pageOf(sp.page);
  const from = (page - 1) * size;
  return { list, page, size, from, to: from + size - 1 };
}
