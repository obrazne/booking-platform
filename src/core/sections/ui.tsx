import type { ReactNode } from "react";
import { tr } from "@/core/i18n/localized";
import { cn } from "@/lib/utils";
import type { Localized } from "./types";

/** Page-width container of the guest page. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

/** Kicker + two-sentence title (first sentence dark, second soft), the heading of every section (visual v1). */
export function Heading({
  kicker,
  title,
  subtitle,
  tone = "light",
  center,
  size = "md",
  as: Tag = "h2",
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  tone?: "light" | "dark";
  center?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("grid gap-3", center && "justify-items-center text-center")}>
      {kicker ? (
        <p className={cn("kicker", tone === "dark" ? "text-[#8fb4e8]" : "text-muted-foreground")}>
          {kicker}
        </p>
      ) : null}
      <Tag
        className={cn(
          "font-heading font-extrabold tracking-tight text-balance",
          tone === "dark" ? "text-white" : "text-ink",
          size === "sm" && "text-2xl leading-tight sm:text-[32px]",
          size === "md" && "text-3xl leading-[1.12] sm:text-[40px]",
          size === "lg" && "max-w-[16ch] text-4xl leading-[1.08] sm:text-5xl",
          size === "xl" && "text-4xl leading-[1.04] sm:text-6xl",
        )}
      >
        {title}
        {subtitle ? (
          <>
            {" "}
            <span className={tone === "dark" ? "text-[#8a97a5]" : "text-ink-soft"}>{subtitle}</span>
          </>
        ) : null}
      </Tag>
    </div>
  );
}

/** Content override if present, else the default text. */
export function pick(value: Localized | undefined, locale: string, fallback: string): string {
  const v = value ? tr(value, locale) : "";
  return v || fallback;
}
