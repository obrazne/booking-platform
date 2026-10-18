import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireTenant } from "@/core/admin/action";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { tr } from "@/core/i18n/localized";
import { createClient } from "@/lib/supabase/server";
import { deleteTestimonial, saveTestimonial } from "./actions";

const SOURCES = ["google", "booking", "airbnb", "email", "other"] as const;

/** Testimonials of the tenant (B1) as compact rows that expand in place (vizuál administrácie v1.1, rule 7). */
export default async function TestimonialsPage() {
  const active = await requireTenant();
  const [t, tf, locale] = await Promise.all([
    getTranslations("testimonials"),
    getTranslations("forms"),
    getLocale(),
  ]);
  const supabase = await createClient();
  const [{ data: rows }, { data: properties }] = await Promise.all([
    supabase
      .from("testimonials")
      .select("*")
      .eq("tenant_id", active.tenantId)
      .order("featured", { ascending: false })
      .order("sort"),
    supabase.from("properties").select("id, name").eq("tenant_id", active.tenantId).order("name"),
  ]);
  const list = rows ?? [];

  const form = (selected?: (typeof list)[number]) => (
    <div className="grid gap-4">
      <ActionForm action={saveTestimonial} bar={Boolean(selected)}>
        <input type="hidden" name="id" value={selected?.id ?? ""} />
        <Field label={t("text")} htmlFor="body">
          <Textarea
            id="body"
            name="body"
            rows={4}
            required
            maxLength={2000}
            defaultValue={selected ? tr(selected.body, locale) : ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("author")} htmlFor="author_name">
            <Input
              id="author_name"
              name="author_name"
              required
              maxLength={80}
              defaultValue={selected?.author_name ?? ""}
            />
          </Field>
          <Field label={t("stayMonth")} htmlFor="stay_month">
            <Input
              id="stay_month"
              name="stay_month"
              type="month"
              defaultValue={selected?.stay_month?.slice(0, 7) ?? ""}
            />
          </Field>
          <Field label={t("source")} htmlFor="source">
            <select id="source" name="source" defaultValue={selected?.source ?? "google"}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`sources.${s}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("sourceUrl")} htmlFor="source_url">
            <Input
              id="source_url"
              name="source_url"
              type="url"
              placeholder="https://"
              defaultValue={selected?.source_url ?? ""}
            />
          </Field>
          <Field label={t("property")} htmlFor="property_id">
            <select id="property_id" name="property_id" defaultValue={selected?.property_id ?? ""}>
              <option value="">{t("allProperties")}</option>
              {(properties ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("sort")} htmlFor="sort">
            <Input
              id="sort"
              name="sort"
              type="number"
              min={0}
              defaultValue={selected?.sort ?? list.length + 1}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="featured" defaultChecked={selected?.featured ?? false} />
            {t("featured")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="published" defaultChecked={selected?.published ?? true} />
            {t("published")}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton>{selected ? tf("save") : tf("add")}</SubmitButton>
          {selected ? <DeleteButton action={deleteTestimonial.bind(null, selected.id)} /> : null}
        </div>
      </ActionForm>
      <Link
        href="/admin/settings"
        className="text-muted-foreground text-xs underline underline-offset-4"
      >
        {t("reviewsLink")}
      </Link>
    </div>
  );

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("offer", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="px-5 pb-14 md:px-10">
        <ExpandableList
          description={`${t("lead")} ${t("otherSources")}`}
          rows={list.map((r) => ({
            id: r.id,
            title: r.author_name,
            meta: [
              t(`sources.${r.source as "google"}`),
              tr(r.body, locale).slice(0, 60) + (tr(r.body, locale).length > 60 ? "…" : ""),
            ].join(" · "),
            status: (
              <span className="flex gap-1.5">
                {r.featured ? <RowState on>{t("featuredBadge")}</RowState> : null}
                {!r.published ? <RowState on={false}>{t("hidden")}</RowState> : null}
              </span>
            ),
            content: form(r),
          }))}
          addLabel={t("new")}
          newRow={{ title: t("new"), content: form() }}
          empty={t("empty")}
        />
      </div>
    </div>
  );
}
