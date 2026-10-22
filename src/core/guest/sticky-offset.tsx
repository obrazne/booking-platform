"use client";

import { useEffect } from "react";

/**
 * Pinned columns of the guest side (Z74, pripomienka 64): a column marked `data-guest-sticky` sticks below the pinned
 * bars (`data-sticky-bar`, e.g. the account's tabs) plus a gap — one CSS variable `--guest-sticky-top` on the root,
 * measured here, so the top of the green card never slides under the tabs. A column taller than the window gets
 * `data-too-tall` and is not pinned (its bottom would never be seen). The rules are in `globals.css`.
 */
export function GuestStickyOffset() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bars = [...document.querySelectorAll<HTMLElement>("[data-sticky-bar]")];
      const bar = bars.reduce((h, el) => h + el.getBoundingClientRect().height, 0);
      root.style.setProperty("--guest-sticky-bar", `${Math.round(bar)}px`);
      const gap = parseFloat(getComputedStyle(root).fontSize) * 1.5;
      const room = window.innerHeight - bar - gap * 2;
      for (const el of document.querySelectorAll<HTMLElement>("[data-guest-sticky]"))
        el.toggleAttribute("data-too-tall", el.offsetHeight > room);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
      root.style.removeProperty("--guest-sticky-bar");
    };
  }, []);
  return null;
}
