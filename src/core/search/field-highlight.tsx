"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * After a click in the search (Z67): `?hl=<field>` brings the field (id or name) into view, focuses it and rings it
 * for a moment. Collapsed sections open (details, rule 4) so the field is visible.
 */
export function FieldHighlight() {
  const pathname = usePathname();
  const field = useSearchParams().get("hl");
  useEffect(() => {
    if (!field || !/^[a-z0-9_-]{1,60}$/i.test(field)) return;
    let ring: HTMLElement | null = null;
    const timer = setTimeout(() => {
      const el =
        document.getElementById(field) ?? document.querySelector<HTMLElement>(`[name="${field}"]`);
      if (!el) return;
      el.closest("details")?.setAttribute("open", "");
      // The field with its label (Field wraps both; a checkbox sits inside its label).
      ring = el.closest("label") ?? el.parentElement ?? el;
      ring.classList.add("search-hl");
      el.scrollIntoView({ block: "center" });
      if (el.matches("input, textarea, select")) el.focus({ preventScroll: true });
    }, 150);
    const off = setTimeout(() => ring?.classList.remove("search-hl"), 2800);
    return () => {
      clearTimeout(timer);
      clearTimeout(off);
      ring?.classList.remove("search-hl");
    };
  }, [pathname, field]);
  return null;
}
