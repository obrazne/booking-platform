"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** The part of JSON Schema (from `z.toJSONSchema`) the section form understands. */
export type FieldSchema = {
  type?: string;
  properties?: Record<string, FieldSchema>;
  additionalProperties?: FieldSchema | boolean;
  items?: FieldSchema;
  enum?: string[];
  maxItems?: number;
  minimum?: number;
};

type Value = unknown;
type Obj = Record<string, Value>;

/** Localized text = object of strings per language ({ "sk": "…" }). */
function isLocalized(s: FieldSchema): boolean {
  return (
    s.type === "object" &&
    !s.properties &&
    typeof s.additionalProperties === "object" &&
    s.additionalProperties.type === "string"
  );
}

const LONG_TEXT = new Set(["perex", "text", "a", "note"]);

/** Drops empty texts, empty items and unset values so section defaults apply (stored content stays small). */
export function cleanContent(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map(cleanContent).filter((v) => v !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Obj = {};
    for (const [k, v] of Object.entries(value as Obj)) {
      const c = cleanContent(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  return value ?? undefined;
}

/**
 * Form generated from the zod schema of a section type (B7, Z18): texts (Slovak for now), choices, numbers,
 * photos of the property and repeatable items. The server validates the result with the same schema.
 */
export function SchemaForm({
  schema,
  value,
  onChange,
  photos,
  amenities,
}: {
  schema: FieldSchema;
  value: Obj;
  onChange: (v: Obj) => void;
  photos: { url: string; alt: string }[];
  /** Amenities of the property (items of "What awaits you" refer to them). */
  amenities: { key: string; name: string }[];
}) {
  const t = useTranslations("sectionsAdmin");
  const entries = Object.entries(schema.properties ?? {});
  if (entries.length === 0) return <p className="text-muted-foreground text-sm">{t("noFields")}</p>;
  return (
    <div className="grid gap-4">
      {entries.map(([key, field]) => (
        <FieldInput
          key={key}
          name={key}
          path={key}
          schema={field}
          value={value[key]}
          onChange={(v) => onChange({ ...value, [key]: v })}
          photos={photos}
          amenities={amenities}
        />
      ))}
    </div>
  );
}

function FieldInput({
  name,
  path,
  schema,
  value,
  onChange,
  photos,
  amenities,
}: {
  name: string;
  path: string;
  schema: FieldSchema;
  value: Value;
  onChange: (v: Value) => void;
  photos: { url: string; alt: string }[];
  amenities: { key: string; name: string }[];
}) {
  const t = useTranslations("sectionsAdmin");
  // Inside a repeated item some fields read differently ("title" is the item's name, not a heading).
  const itemKey = `fields.item.${name}`;
  const key = path.includes("-") && t.has(itemKey as never) ? itemKey : `fields.${name}`;
  const label = t.has(key as never) ? t(key as "fields.title") : name;
  const id = `sf-${path}`;

  if (isLocalized(schema)) {
    const text = ((value as Obj | undefined)?.sk as string | undefined) ?? "";
    const set = (v: string) => onChange({ ...((value as Obj) ?? {}), sk: v });
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {LONG_TEXT.has(name) ? (
          <Textarea id={id} rows={3} value={text} onChange={(e) => set(e.target.value)} />
        ) : (
          <Input id={id} value={text} onChange={(e) => set(e.target.value)} />
        )}
      </div>
    );
  }

  if (name === "amenity" && schema.type === "string") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">{t("customItem")}</option>
          {amenities.map((a) => (
            <option key={a.key} value={a.key}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.enum) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">{t("auto")}</option>
          {schema.enum.map((o) => (
            <option key={o} value={o}>
              {t.has(`icons.${o}` as never) ? t(`icons.${o}` as "icons.sauna") : o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if ((schema.type === "integer" || schema.type === "number") && name === "photo") {
    const selected = typeof value === "number" ? value : null;
    return (
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{label}</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <button
              key={p.url}
              type="button"
              aria-pressed={selected === i}
              aria-label={`${t("photo")} ${i + 1}${p.alt ? `: ${p.alt}` : ""}`}
              onClick={() => onChange(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg ring-offset-2",
                selected === i && "ring-primary ring-2",
              )}
            >
              <Image src={p.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
        {photos.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noPhotos")}</p>
        ) : null}
      </fieldset>
    );
  }

  if (schema.type === "integer" || schema.type === "number") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          min={schema.minimum}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </div>
    );
  }

  if (schema.type === "array" && schema.items) {
    const items = Array.isArray(value) ? (value as Obj[]) : [];
    const max = schema.maxItems ?? 50;
    const set = (next: Obj[]) => onChange(next);
    return (
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">{label}</legend>
        {items.map((item, i) => (
          <div key={i} className="border-border grid gap-3 rounded-xl border p-3">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground flex-1 text-xs">
                {t("item")} {i + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveUp")}
                disabled={i === 0}
                onClick={() => {
                  const next = [...items];
                  [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                  set(next);
                }}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("moveDown")}
                disabled={i === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                  set(next);
                }}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("removeItem")}
                onClick={() => set(items.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            {Object.entries(schema.items!.properties ?? {}).map(([k, f]) => (
              <FieldInput
                key={k}
                name={k}
                path={`${path}-${i}-${k}`}
                schema={f}
                value={item[k]}
                onChange={(v) => set(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))}
                photos={photos}
                amenities={amenities}
              />
            ))}
          </div>
        ))}
        {items.length < max ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => set([...items, {}])}
          >
            <Plus /> {t("addItem")}
          </Button>
        ) : null}
      </fieldset>
    );
  }

  if (schema.type === "string") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return null;
}
