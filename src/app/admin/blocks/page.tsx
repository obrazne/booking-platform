import { getLocale, getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";
import { requireTenant } from "@/core/admin/action";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList } from "@/core/admin/expandable-list";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { groupCrumbs } from "@/core/admin/nav-crumbs";
import { PageHeader } from "@/core/admin/page-header";
import { formatDate } from "@/core/format/format";
import { createClient } from "@/lib/supabase/server";
import { createBlock, deleteBlock } from "./actions";

/** Owner blocks (personal use, maintenance) as compact rows (vizuál administrácie v1.1, rule 7). */
export default async function BlocksPage() {
  const active = await requireTenant();
  const [t, locale] = await Promise.all([getTranslations("blocks"), getLocale()]);
  const supabase = await createClient();
  const [{ data: blocks }, { data: units }] = await Promise.all([
    supabase
      .from("occupancy")
      .select("id, nights, label, unit:units(name, property:properties(name, booking_mode))")
      .eq("tenant_id", active.tenantId)
      .eq("kind", "block")
      .order("nights"),
    supabase
      .from("units")
      .select("id, name, active, property:properties(name, booking_mode)")
      .eq("tenant_id", active.tenantId)
      .eq("active", true)
      .order("name"),
  ]);
  const unitLabel = (u: {
    name: string;
    property: { name: string; booking_mode: string } | null;
  }) =>
    u.property?.booking_mode === "units"
      ? `${u.property.name} — ${u.name}`
      : (u.property?.name ?? u.name);
  const range = (nights: unknown) => {
    const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(nights));
    return m ? `${formatDate(m[1]!, locale)} – ${formatDate(m[2]!, locale)}` : String(nights);
  };
  const several = (units ?? []).length > 1;

  return (
    <div data-bleed>
      <PageHeader
        breadcrumbs={await groupCrumbs("reservations", t("title"), active.tenantId)}
        title={t("title")}
      />
      <div className="px-5 pb-14 md:px-10">
        <ExpandableList
          description={t("hint")}
          rows={(blocks ?? []).map((b) => ({
            id: b.id,
            title: b.label || t("untitled"),
            meta: [range(b.nights), several && b.unit ? unitLabel(b.unit) : null]
              .filter(Boolean)
              .join(" · "),
            content: (
              <div className="grid gap-3 text-sm font-normal">
                <p className="text-muted-foreground">{t("hint")}</p>
                <div>
                  <DeleteButton action={deleteBlock.bind(null, b.id)} />
                </div>
              </div>
            ),
          }))}
          addLabel={t("addRow")}
          newRow={{
            title: t("newBlock"),
            content: (
              <ActionForm action={createBlock} resetOnSuccess>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("unit")} htmlFor="unit_id">
                    <select
                      id="unit_id"
                      name="unit_id"
                      required
                      className="border-input bg-background h-10 rounded-full border px-4 text-sm"
                    >
                      {(units ?? []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {unitLabel(u)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("label")} htmlFor="label">
                    <Input id="label" name="label" maxLength={80} />
                  </Field>
                  <Field label={t("from")} htmlFor="from">
                    <Input id="from" name="from" type="date" required />
                  </Field>
                  <Field label={t("to")} htmlFor="to">
                    <Input id="to" name="to" type="date" required />
                  </Field>
                </div>
                <div>
                  <SubmitButton>{t("add")}</SubmitButton>
                </div>
              </ActionForm>
            ),
          }}
          empty={t("empty")}
        />
      </div>
    </div>
  );
}
