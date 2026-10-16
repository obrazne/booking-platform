"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/core/admin/form";
import { PanelLink } from "@/core/admin/record-panel";
import { cleanContent, SchemaForm, type FieldSchema } from "@/core/sections/schema-form";
import { cn } from "@/lib/utils";
import {
  addSection,
  deleteSection,
  moveSection,
  resetSections,
  saveSectionContent,
  toggleSection,
} from "../../section-actions";

export type SectionRow = {
  id: string;
  type: string;
  name: string;
  summary: string;
  enabled: boolean;
  known: boolean;
};

function useRun() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success?: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (success) toast.success(success);
        router.refresh();
      } else {
        toast.error(
          t.has(`sectionsAdmin.errors.${r.error}` as never)
            ? t(`sectionsAdmin.errors.${r.error}` as "sectionsAdmin.errors.invalid")
            : t("forms.errors.generic"),
        );
      }
    });
  return { run, pending };
}

/** Sections of the page in their order: switch, move (buttons and Alt+arrows), edit in the side panel, remove. */
export function SectionList({ sections }: { sections: SectionRow[] }) {
  const t = useTranslations("sectionsAdmin");
  const { run, pending } = useRun();
  return (
    <ol className="divide-border grid divide-y rounded-xl border" aria-label={t("listLabel")}>
      {sections.map((s, i) => {
        const calendar = s.type === "calendar";
        return (
          <li
            key={s.id}
            tabIndex={0}
            aria-label={`${i + 1}. ${s.name}`}
            onKeyDown={(e) => {
              if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
              e.preventDefault();
              run(() => moveSection(s.id, e.key === "ArrowUp" ? -1 : 1));
            }}
            className={cn(
              "focus-visible:ring-ring flex flex-wrap items-center gap-3 px-3 py-2.5 outline-none focus-visible:ring-2",
              !s.enabled && "opacity-60",
            )}
          >
            <span className="text-muted-foreground w-6 text-right font-mono text-xs">{i + 1}</span>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-medium">
                {s.name}
                {!s.known ? (
                  <span className="text-muted-foreground text-xs"> · {t("unknownType")}</span>
                ) : null}
              </span>
              {s.summary ? (
                <span className="text-muted-foreground truncate text-xs">{s.summary}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {calendar ? (
                <span
                  className="text-muted-foreground inline-flex items-center gap-1 px-2 text-xs"
                  title={t("calendarRequired")}
                >
                  <Lock className="size-3.5" /> {t("required")}
                </span>
              ) : (
                <Switch
                  checked={s.enabled}
                  disabled={pending}
                  aria-label={t("visible", { name: s.name })}
                  onCheckedChange={(v) => run(() => toggleSection(s.id, v))}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveUp")}
                disabled={pending || i === 0}
                onClick={() => run(() => moveSection(s.id, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveDown")}
                disabled={pending || i === sections.length - 1}
                onClick={() => run(() => moveSection(s.id, 1))}
              >
                <ArrowDown />
              </Button>
              {s.known ? (
                <Button asChild variant="ghost" size="icon">
                  <PanelLink type="section" id={s.id} aria-label={t("edit", { name: s.name })}>
                    <Pencil />
                  </PanelLink>
                </Button>
              ) : null}
              {!calendar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("remove", { name: s.name })}
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(t("removeConfirm", { name: s.name })))
                      run(() => deleteSection(s.id));
                  }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "Add section" from the types the page does not have yet. */
export function AddSection({
  propertyId,
  options,
}: {
  propertyId: string;
  options: { type: string; name: string }[];
}) {
  const t = useTranslations("sectionsAdmin");
  const { run, pending } = useRun();
  const [type, setType] = useState(options[0]?.type ?? "");
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="add-section" className="sr-only">
        {t("addLabel")}
      </label>
      <select
        id="add-section"
        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.type} value={o.type}>
            {o.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        disabled={pending || !type}
        onClick={() => run(() => addSection(propertyId, type), t("added"))}
      >
        <Plus /> {t("add")}
      </Button>
    </div>
  );
}

/** "Reset by template" — replaces all sections, after confirmation. */
export function ResetSections({
  propertyId,
  templates,
}: {
  propertyId: string;
  templates: { key: string; name: string }[];
}) {
  const t = useTranslations("sectionsAdmin");
  const tc = useTranslations("common");
  const { run, pending } = useRun();
  const [template, setTemplate] = useState(templates[0]?.key ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="reset-template" className="sr-only">
        {t("template")}
      </label>
      <select
        id="reset-template"
        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
      >
        {templates.map((o) => (
          <option key={o.key} value={o.key}>
            {o.name}
          </option>
        ))}
      </select>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={pending}>
            <RotateCcw /> {t("reset")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("resetText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => resetSections(propertyId, template), t("resetDone"))}
            >
              {t("reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Form of one section in the side panel, generated from the schema of its type. */
export function SectionEditor({
  id,
  schema,
  initial,
  photos,
  amenities,
}: {
  id: string;
  schema: FieldSchema;
  initial: Record<string, unknown>;
  photos: { url: string; alt: string }[];
  amenities: { key: string; name: string }[];
}) {
  const t = useTranslations("sectionsAdmin");
  const [value, setValue] = useState(initial);
  const { run, pending } = useRun();
  const hasFields = Object.keys(schema.properties ?? {}).length > 0;
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSectionContent(id, cleanContent(value) ?? {}), t("saved"));
      }}
    >
      <SchemaForm
        schema={schema}
        value={value}
        onChange={setValue}
        photos={photos}
        amenities={amenities}
      />
      {hasFields ? (
        <Button type="submit" disabled={pending} className="justify-self-start">
          {t("save")}
        </Button>
      ) : null}
    </form>
  );
}
