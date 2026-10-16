import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireTenant } from "@/core/admin/action";
import { DeleteButton } from "@/core/admin/delete-button";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { parsePanel } from "@/core/admin/panel-param";
import { PanelLink, RecordPanel } from "@/core/admin/record-panel";
import { tr } from "@/core/i18n/localized";
import { createClient } from "@/lib/supabase/server";
import { deleteTestimonial, saveTestimonial } from "./actions";

const SOURCES = ["google", "booking", "airbnb", "email", "other"] as const;

/** Testimonials of the tenant (B1): list + side panel (A18). */
export default async function TestimonialsPage({ searchParams }: PageProps<"/admin/testimonials">) {
  const active = await requireTenant();
  const [t, tf, locale, sp] = await Promise.all([
    getTranslations("testimonials"),
    getTranslations("forms"),
    getLocale(),
    searchParams,
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
  const panel = parsePanel(sp.panel);
  const isNew = panel?.type === "testimonial" && panel.id === "new";
  const selected =
    panel?.type === "testimonial" && !isNew ? list.find((r) => r.id === panel.id) : undefined;
  const editing = isNew || selected;
  const selectClass = "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";
  const propName = (id: string | null) =>
    id ? (properties ?? []).find((p) => p.id === id)?.name : t("allProperties");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{t("lead")}</p>
        </div>
        <Button asChild>
          <PanelLink type="testimonial" id="new">
            <Plus /> {t("new")}
          </PanelLink>
        </Button>
      </div>
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("author")}</TableHead>
              <TableHead>{t("text")}</TableHead>
              <TableHead>{t("source")}</TableHead>
              <TableHead>{t("property")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <PanelLink type="testimonial" id={r.id} className="hover:underline">
                      {r.author_name}
                    </PanelLink>{" "}
                    {r.featured ? <Badge variant="secondary">{t("featuredBadge")}</Badge> : null}
                    {!r.published ? <Badge variant="outline">{t("hidden")}</Badge> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate">
                    {tr(r.body, locale)}
                  </TableCell>
                  <TableCell>{t(`sources.${r.source as "google"}`)}</TableCell>
                  <TableCell>{propName(r.property_id)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <RecordPanel title={selected ? selected.author_name : t("new")}>
          <div className="grid gap-6 p-4">
            <ActionForm action={saveTestimonial}>
              <input type="hidden" name="id" value={selected?.id ?? ""} />
              <Field label={t("text")} htmlFor="body">
                <Textarea
                  id="body"
                  name="body"
                  rows={5}
                  required
                  maxLength={2000}
                  defaultValue={selected ? tr(selected.body, locale) : ""}
                />
              </Field>
              <Field label={t("author")} htmlFor="author_name">
                <Input
                  id="author_name"
                  name="author_name"
                  required
                  maxLength={80}
                  defaultValue={selected?.author_name ?? ""}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("stayMonth")} htmlFor="stay_month">
                  <Input
                    id="stay_month"
                    name="stay_month"
                    type="month"
                    defaultValue={selected?.stay_month?.slice(0, 7) ?? ""}
                  />
                </Field>
                <Field label={t("source")} htmlFor="source">
                  <select
                    id="source"
                    name="source"
                    className={selectClass}
                    defaultValue={selected?.source ?? "google"}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {t(`sources.${s}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t("sourceUrl")} htmlFor="source_url">
                <Input
                  id="source_url"
                  name="source_url"
                  type="url"
                  placeholder="https://"
                  defaultValue={selected?.source_url ?? ""}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("property")} htmlFor="property_id">
                  <select
                    id="property_id"
                    name="property_id"
                    className={selectClass}
                    defaultValue={selected?.property_id ?? ""}
                  >
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="featured" defaultChecked={selected?.featured ?? false} />{" "}
                {t("featured")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="published" defaultChecked={selected?.published ?? true} />{" "}
                {t("published")}
              </label>
              <div className="flex items-center gap-2">
                <SubmitButton>{tf("save")}</SubmitButton>
                {selected ? (
                  <DeleteButton action={deleteTestimonial.bind(null, selected.id)} />
                ) : null}
              </div>
            </ActionForm>
            <Link
              href="/admin/settings"
              className="text-muted-foreground text-xs underline underline-offset-4"
            >
              {t("reviewsLink")}
            </Link>
          </div>
        </RecordPanel>
      ) : null}
    </div>
  );
}
