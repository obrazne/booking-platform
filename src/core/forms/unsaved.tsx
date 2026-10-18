"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Unsaved changes (Z55, docs/pravidla-rozhrania.md rule 3): forms register here, one bar at the bottom of the page
 * says "Máte neuložené zmeny · Zahodiť · Uložiť" for all of them, and leaving the page asks first.
 */
type Entry = { dirty: boolean; submit: () => void; reset: () => void };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const anyDirty = () => [...entries.values()].some((e) => e.dirty);

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isField = (el: Element): el is Field =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;
const valueOf = (el: Field) =>
  el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")
    ? String(el.checked)
    : el instanceof HTMLSelectElement && el.multiple
      ? [...el.selectedOptions].map((o) => o.value).join("\u0000")
      : el.value;
const fieldsOf = (form: HTMLFormElement) =>
  [...form.elements].filter(isField).filter((el) => el.type !== "submit" && el.type !== "button");

/**
 * Tracks the fields of a form against their values when it loaded (or was last saved): marks changed fields with
 * `data-changed` and registers the form for the bar. `saved()` after a successful save takes the new values.
 */
export function useUnsavedForm(ref: RefObject<HTMLFormElement | null>, enabled = true) {
  const id = useId();
  const [dirty, setDirty] = useState(false);
  const snapshot = useRef<Map<Field, string>>(new Map());

  const take = useCallback(() => {
    const form = ref.current;
    if (!form) return;
    snapshot.current = new Map(fieldsOf(form).map((el) => [el, valueOf(el)]));
    for (const el of fieldsOf(form)) el.removeAttribute("data-changed");
  }, [ref]);

  const check = useCallback(() => {
    const form = ref.current;
    if (!form) return;
    let changed = false;
    for (const el of fieldsOf(form)) {
      const before = snapshot.current.get(el);
      // A field added later (a new date range) counts as a change once it has a value.
      const differs =
        before === undefined ? valueOf(el) !== "" && el.type !== "hidden" : before !== valueOf(el);
      if (differs) changed = true;
      if (differs && el.type !== "hidden") el.setAttribute("data-changed", "");
      else el.removeAttribute("data-changed");
    }
    setDirty(changed);
  }, [ref]);

  useEffect(() => {
    const form = ref.current;
    if (!form || !enabled) return;
    take();
    // Radix selects and similar widgets change hidden fields on click — check after every interaction.
    const later = () => window.setTimeout(check, 0);
    const events = ["input", "change", "click", "keyup"] as const;
    for (const e of events) form.addEventListener(e, later);
    return () => {
      for (const e of events) form.removeEventListener(e, later);
    };
  }, [ref, enabled, take, check]);

  useEffect(() => {
    if (!enabled) return;
    entries.set(id, {
      dirty,
      submit: () => ref.current?.requestSubmit(),
      reset: () => {
        ref.current?.reset();
        window.setTimeout(check, 0);
      },
    });
    emit();
  }, [id, dirty, enabled, ref, check]);
  useEffect(
    () => () => {
      entries.delete(id);
      emit();
    },
    [id],
  );

  const saved = useCallback(() => {
    take();
    setDirty(false);
  }, [take]);
  return { dirty: enabled && dirty, saved };
}

/** The bar of unsaved changes and the question before leaving — mounted once per layout. */
export function UnsavedBar() {
  const t = useTranslations("forms.unsaved");
  const dirty = useSyncExternalStore(subscribe, anyDirty, () => false);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    // Links inside the app (Next navigation has no hook to stop it): ask before following one.
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm(t("leave"))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, t]);

  if (!dirty) return null;
  return (
    <div
      role="region"
      aria-label={t("label")}
      className="border-line fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[640px] flex-wrap items-center gap-3 rounded-[14px] border bg-white px-4 py-3 shadow-[0_10px_30px_rgb(17_33_47/0.16)] sm:inset-x-6"
    >
      <span className="text-ink mr-auto flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className="size-2 rounded-full bg-[var(--changed)]" />
        {t("text")}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          for (const e of entries.values()) if (e.dirty) e.reset();
        }}
      >
        {t("discard")}
      </Button>
      <Button
        type="button"
        className="font-bold"
        onClick={() => {
          for (const e of entries.values()) if (e.dirty) e.submit();
        }}
      >
        {t("save")}
      </Button>
    </div>
  );
}
