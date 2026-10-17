import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

/** Breadcrumbs on sub-pages of the control center (v1.2): Klienti › Chalet STRÖMY › Vzhľad. */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[13px]">
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
