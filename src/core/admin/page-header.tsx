import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * Page header of the administration (rule 3): copper kicker (accommodation or "Riadiace centrum") + H1 32 px,
 * actions on the right. On a phone the actions wrap under the title.
 */
export function PageHeader({
  kicker,
  breadcrumbs,
  title,
  actions,
}: {
  kicker?: ReactNode;
  /** Second-level pages (common rule v1.2): shown instead of the kicker. */
  breadcrumbs?: Crumb[];
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 md:px-10 md:pt-8">
      <div className="grid gap-1.5">
        {breadcrumbs?.length ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : kicker ? (
          <span className="kicker text-brand-secondary">{kicker}</span>
        ) : null}
        <h1 className="text-ink text-[28px] leading-tight font-extrabold tracking-[-0.03em] md:text-[32px]">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}

/** Content area under the header with the page's side padding. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-14 md:px-10 ${className ?? ""}`}>{children}</div>;
}
