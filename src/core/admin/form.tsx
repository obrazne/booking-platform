"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedForm } from "@/core/forms/unsaved";
import { cn } from "@/lib/utils";

/** Result of an admin server action. `error` is a key under `forms.errors`. */
export type ActionResult = { ok: boolean; error?: string; at?: number };
export const initialResult: ActionResult = { ok: false };

/** Message key of a failed action under `forms.errors`, falling back to the generic one. */
export function errorKey(t: { has: (key: "errors.generic") => boolean }, error?: string) {
  const key = `errors.${error}` as "errors.generic";
  return error && t.has(key) ? key : "errors.generic";
}

/** Inside a form saved through the bar of unsaved changes (Z55): its own Uložiť stays out of sight. */
const BarContext = createContext(false);

/**
 * Form bound to a server action; shows a toast on success or error (rule 3). Editing forms (`bar`, the default unless
 * `resetOnSuccess`) are saved through the bar at the bottom of the page — one for all sections — which appears with
 * the first change; changed fields are marked and leaving the page asks first. Forms that add something ("Pridať")
 * keep their own button.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  bar = !resetOnSuccess,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  bar?: boolean;
}) {
  const t = useTranslations("forms");
  const [state, formAction] = useActionState(action, initialResult);
  const ref = useRef<HTMLFormElement>(null);
  const { saved } = useUnsavedForm(ref, bar);
  useEffect(() => {
    if (!state.at) return;
    if (state.ok) {
      // One toast for several sections saved together from the bar.
      toast.success(t("saved"), { id: "form-saved" });
      if (resetOnSuccess) ref.current?.reset();
      saved();
    } else {
      toast.error(t(errorKey(t, state.error)), { id: `form-error-${state.error ?? ""}` });
    }
  }, [state, t, resetOnSuccess, saved]);
  return (
    <BarContext.Provider value={bar}>
      <form ref={ref} action={formAction} className={cn("grid gap-4", className)}>
        {children}
      </form>
    </BarContext.Provider>
  );
}

export function SubmitButton({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "default" | "outline" | "destructive" | "ghost";
}) {
  const { pending } = useFormStatus();
  const bar = useContext(BarContext);
  // Saved from the bar: the button stays only for Enter in a field (implicit submission).
  if (bar) return <button type="submit" hidden aria-hidden tabIndex={-1} />;
  return (
    <Button type="submit" disabled={pending} variant={variant} className="justify-self-start">
      {children}
    </Button>
  );
}

export function Field({
  label,
  hint,
  info,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** Smaller ⓘ next to the label (rule 8) — `<FieldHelp id="…" />`. */
  info?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {info ? (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={htmlFor}>{label}</Label>
          {info}
        </div>
      ) : (
        <Label htmlFor={htmlFor}>{label}</Label>
      )}
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/** Inputs for one translatable text, a tab per language of the tenant (single field when only one language). */
export function LocalizedField({
  name,
  label,
  hint,
  locales,
  value,
  multiline = false,
  rows = 4,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  locales: readonly string[];
  value: Record<string, string>;
  multiline?: boolean;
  rows?: number;
}) {
  const input = (l: string) =>
    multiline ? (
      <Textarea
        id={`${name}.${l}`}
        name={`${name}.${l}`}
        defaultValue={value[l] ?? ""}
        rows={rows}
      />
    ) : (
      <Input id={`${name}.${l}`} name={`${name}.${l}`} defaultValue={value[l] ?? ""} />
    );
  if (locales.length <= 1) {
    const l = locales[0] ?? "sk";
    return (
      <Field label={label} hint={hint} htmlFor={`${name}.${l}`}>
        {input(l)}
      </Field>
    );
  }
  return (
    <Field label={label} hint={hint}>
      <Tabs defaultValue={locales[0]}>
        <TabsList>
          {locales.map((l) => (
            <TabsTrigger key={l} value={l}>
              {l.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {locales.map((l) => (
          <TabsContent key={l} value={l}>
            {input(l)}
          </TabsContent>
        ))}
      </Tabs>
    </Field>
  );
}
