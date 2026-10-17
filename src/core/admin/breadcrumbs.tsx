import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumbs (common rule v1.2, administration and control center): small, above the page title, only from the
 * second level; every crumb but the last is a link, the last is the current page. Phones: only "‹ Späť na <parent>".
 */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label?: string }) {
  const t = useTranslations("shell");
  const parent = items
    .slice(0, -1)
    .reverse()
    .find((c) => c.href);
  return (
    <nav aria-label={label ?? t("breadcrumbs")}>
      {parent ? (
        <Link
          href={parent.href!}
          className="text-muted-foreground hover:text-ink inline-flex min-h-8 items-center gap-1 text-[13px] md:hidden"
        >
          <ChevronLeft aria-hidden className="size-4" /> {t("backTo", { name: parent.label })}
        </Link>
      ) : null}
      <ol className="text-muted-foreground hidden flex-wrap items-center gap-1.5 text-[13px] md:flex">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 ? <ChevronRight aria-hidden className="size-3.5 opacity-60" /> : null}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:text-ink underline-offset-4 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span
                aria-current={i === items.length - 1 ? "page" : undefined}
                className="text-ink font-medium"
              >
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
