"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Result of an admin server action. `error` is a key under `forms.errors`. */
export type ActionResult = { ok: boolean; error?: string; at?: number };
export const initialResult: ActionResult = { ok: false };

/** Form bound to a server action; shows a toast on success or error. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const t = useTranslations("forms");
  const [state, formAction] = useActionState(action, initialResult);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.at) return;
    if (state.ok) {
      toast.success(t("saved"));
      if (resetOnSuccess) ref.current?.reset();
    } else {
      toast.error(
        t.has(`errors.${state.error}` as "errors.generic")
          ? t(`errors.${state.error}` as "errors.generic")
          : t("errors.generic"),
      );
    }
  }, [state, t, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={cn("grid gap-4", className)}>
      {children}
    </form>
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
  return (
    <Button type="submit" disabled={pending} variant={variant} className="justify-self-start">
      {children}
    </Button>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
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
