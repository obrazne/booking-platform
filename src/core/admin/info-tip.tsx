"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils";

export type InfoTipText = {
  title: string;
  text: string;
  /** Link to the question in Pomoc ("Ako blokovať termín ›"). */
  more?: { href: string; label: string };
};

/**
 * Explanation ⓘ (rule 8, doska 14): closed by default, opens under the mouse, on keyboard focus and on a tap; a click
 * keeps it open, Esc or a click outside closes it. The text is also the button's `aria-describedby`, so a screen
 * reader hears it without opening. `size="field"` is the smaller one next to a field's label.
 */
export function InfoTip({
  title,
  text,
  more,
  label,
  size = "page",
}: InfoTipText & { label: string; size?: "page" | "field" }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const leave = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(leave.current), []);
  const show = () => {
    window.clearTimeout(leave.current);
    setOpen(true);
  };
  const hideSoon = () => {
    if (pinned) return;
    window.clearTimeout(leave.current);
    leave.current = window.setTimeout(() => setOpen(false), 150);
  };
  const close = () => {
    setOpen(false);
    setPinned(false);
  };

  return (
    <P.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <P.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-describedby={`${id}-text`}
          data-info-tip=""
          onPointerEnter={(e) => e.pointerType === "mouse" && show()}
          onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
          onBlur={(e) => {
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null))
              hideSoon();
          }}
          onClick={(e) => {
            e.preventDefault();
            if (pinned) close();
            else {
              setPinned(true);
              show();
            }
          }}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--field-border)] align-middle font-serif leading-none font-bold text-[#3b4652] italic transition-colors hover:border-[var(--field-border-hover)] hover:bg-[var(--hover-row)]",
            size === "page" ? "size-[22px] text-[13px]" : "size-4 text-[10px]",
            open && "border-ink bg-[var(--hover-row)]",
          )}
        >
          i
        </button>
      </P.Trigger>
      <span id={`${id}-text`} className="sr-only">
        {title}. {text}
      </span>
      <P.Content
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Focus stays where it is: returning it to the button would open the ⓘ again (focus opens it).
        onCloseAutoFocus={(e) => e.preventDefault()}
        data-info-tip-content=""
        onPointerEnter={show}
        onPointerLeave={hideSoon}
        className="text-ink z-50 grid w-[min(340px,calc(100vw-32px))] gap-1.5 rounded-[12px] border border-[var(--card-border)] bg-white p-4 text-left text-sm leading-relaxed font-normal tracking-normal shadow-[0_10px_30px_rgb(17_33_47/0.14)]"
      >
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[#3b4652]">{text}</span>
        {more ? (
          <Link
            href={more.href}
            className="text-ink mt-1 justify-self-start font-medium underline underline-offset-[3px]"
          >
            {more.label}
          </Link>
        ) : null}
      </P.Content>
    </P.Root>
  );
}
