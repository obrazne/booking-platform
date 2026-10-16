import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { RecordPanel } from "@/core/admin/record-panel";
import { parsePanel } from "@/core/admin/panel-param";
import { tr } from "@/core/i18n/localized";
import { getEnabledModules } from "@/core/modules/registry";
import { sectionTypes } from "@/core/sections/registry";
import type { FieldSchema } from "@/core/sections/schema-form";
import { createClient } from "@/lib/supabase/server";
import { getPropertyForEdit, photoUrl } from "../../data";
import { AddSection, ResetSections, SectionEditor, SectionList } from "./sections-ui";

/** Where the facts shown by a section are changed (they are never typed into the section, B7). */
function systemLinks(type: string, base: string): { key: string; href: string }[] {
  switch (type) {
    case "gallery":
    case "photo_band":
      return [{ key: "photos", href: `${base}/photos` }];
    case "calendar":
    case "prices":
      return [{ key: "pricing", href: `${base}/pricing` }];
    case "units":
      return [{ key: "units", href: `${base}/units` }];
    case "rules":
      return [
        { key: "settings", href: "/admin/settings" },
        { key: "details", href: base },
      ];
    case "contact":
    case "cta":
      return [{ key: "settings", href: "/admin/settings" }];
    case "services":
      return [{ key: "services", href: "/admin/services" }];
    case "testimonials":
      return [];
    default:
      return [{ key: "details", href: base }];
  }
}

/** "Page" tab of the property editor (Z18): sections of the guest page — order, switches, texts, template. */
export default async function PropertyPageSections({
  params,
  searchParams,
}: PageProps<"/admin/properties/[id]/page">) {
  const [{ id }, sp, t, locale] = await Promise.all([
    params,
    searchParams,
    getTranslations("sectionsAdmin"),
    getLocale(),
  ]);
  const { tenant, property, photos, termIds } = await getPropertyForEdit(id);
  const supabase = await createClient();
  const [{ data: sections }, { data: templates }, { data: domains }, { data: terms }, modules] =
    await Promise.all([
      supabase
        .from("property_sections")
        .select("id, type, sort, enabled, content")
        .eq("property_id", property.id)
        .order("sort")
        .order("created_at"),
      supabase.from("section_templates").select("key, name").order("sort"),
      supabase.from("tenant_domains").select("hostname, is_primary").eq("tenant_id", tenant.id),
      supabase.from("terms").select("id, key, kind, name").eq("kind", "amenity"),
      getEnabledModules(tenant.id),
    ]);
  const types = sectionTypes(modules.map((m) => m.key));
  const name = (type: string) =>
    t.has(`types.${type}` as never) ? t(`types.${type}` as "types.gallery") : type;
  const base = `/admin/properties/${property.id}`;

  const rows = (sections ?? []).map((s) => {
    const c = (s.content ?? {}) as Record<string, unknown>;
    const items = Array.isArray(c.items) ? c.items.length : 0;
    return {
      id: s.id,
      type: s.type,
      name: name(s.type),
      enabled: s.enabled,
      known: types.has(s.type),
      summary: [
        tr(c.title, locale),
        tr(c.kicker, locale),
        items ? t("items", { count: items }) : "",
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });
  const present = new Set(rows.map((r) => r.type));
  const addable = [...types.keys()]
    .filter((type) => !present.has(type))
    .map((type) => ({ type, name: name(type) }));

  const host =
    (domains ?? []).find((d) => d.is_primary && !d.hostname.endsWith(".localhost"))?.hostname ??
    (domains ?? []).find((d) => !d.hostname.endsWith(".localhost"))?.hostname;
  const preview = host ? `https://${host}/p/${property.slug}` : null;

  const panel = parsePanel(sp.panel);
  const open = panel?.type === "section" ? (sections ?? []).find((s) => s.id === panel.id) : null;
  const openDef = open ? types.get(open.type) : undefined;
  const schema = openDef
    ? (z.toJSONSchema(openDef.schema, { unrepresentable: "any" }) as FieldSchema)
    : null;

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-heading text-lg font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground max-w-xl text-sm">{t("lead")}</p>
        </div>
        {preview ? (
          <a
            href={preview}
            target="_blank"
            rel="noreferrer"
            className="border-border hover:bg-accent inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
          >
            <ExternalLink className="size-4" /> {t("preview")}
          </a>
        ) : null}
      </div>
      {property.status !== "published" ? (
        <p className="text-muted-foreground text-sm">{t("draftNote")}</p>
      ) : null}

      <SectionList sections={rows} />
      <p className="text-muted-foreground text-xs">{t("keyboardHint")}</p>

      <div className="border-border grid gap-4 border-t pt-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">{t("add")}</h3>
          {addable.length > 0 ? (
            <AddSection propertyId={property.id} options={addable} />
          ) : (
            <p className="text-muted-foreground text-sm">{t("allAdded")}</p>
          )}
        </div>
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">{t("template")}</h3>
          <ResetSections
            propertyId={property.id}
            templates={(templates ?? []).map((x) => ({ key: x.key, name: tr(x.name, locale) }))}
          />
        </div>
      </div>

      {open && openDef && schema ? (
        <RecordPanel
          title={name(open.type)}
          description={
            t.has(`hints.${open.type}` as never)
              ? t(`hints.${open.type}` as "hints.intro")
              : undefined
          }
        >
          <div className="grid gap-6 p-4">
            {systemLinks(open.type, base).length > 0 ? (
              <div className="bg-muted/50 grid gap-1 rounded-lg p-3 text-sm">
                <p>{t("systemData")}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {systemLinks(open.type, base).map((l) => (
                    <Link
                      key={l.key}
                      href={l.href}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t(`links.${l.key}` as "links.details")}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <SectionEditor
              key={open.id}
              id={open.id}
              schema={schema}
              initial={(open.content ?? {}) as Record<string, unknown>}
              photos={photos.map((p) => ({
                url: photoUrl(p.storage_path),
                alt: tr(p.alt, locale),
              }))}
              amenities={(terms ?? [])
                .filter((x) => termIds.has(x.id))
                .map((x) => ({ key: x.key, name: tr(x.name, locale) }))}
            />
          </div>
        </RecordPanel>
      ) : null}
    </div>
  );
}
